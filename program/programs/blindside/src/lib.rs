//! Blindside — fast SOL calls with a hidden close.
//!
//! Every 90 s a round runs on the wall clock (round = floor(unix / 90)):
//!
//!   0–50 s   calls are accepted. Somewhere in 10–50 s the round secretly closes:
//!            the price at that moment becomes the starting price. Calls that
//!            landed after it are refunded. The close second is fixed at 10 s
//!            from the keeper's secret and every player's nonce so far, so no
//!            single party can predict it (see `logic.rs`).
//!   +30 s    the result price is recorded.
//!   80 s     the round is revealed: close time, prices, pools and calls go public.
//!
//! Where things live:
//!   * Base layer: config, test-USDC mint + vault, deposits/withdrawals, faucet.
//!   * Private Ephemeral Rollup (TEE): 8 reusable round slots with NO readers
//!     until the reveal, and each player's balance (readable only by them).
//!
//! Opening a round needs the keeper key (it seeds the secret); the admin
//! assigns that key with `set_keeper` and can rotate it. Ticking,
//! revealing and paying out are permissionless and gated by the clock, so no
//! one can steer a running round. The rules themselves are plain functions in
//! `logic.rs`, unit-tested there.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, TransferChecked};
use ephemeral_rollups_sdk::access_control::instructions::{
    CreatePermissionCpiBuilder, DelegatePermissionCpiBuilder, UpdatePermissionCpiBuilder,
};
use ephemeral_rollups_sdk::access_control::structs::{Member, MembersArgs};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use ephemeral_vrf_sdk::anchor::{vrf, vrf_callback};
use ephemeral_vrf_sdk::consts::{
    program_identity_pubkey, scoped_vrf_identity_const, DEFAULT_EPHEMERAL_QUEUE,
};
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix_const, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

pub mod constants;
pub mod errors;
pub mod logic;
pub mod state;

use constants::*;
use errors::BlindsideError;
use state::*;

declare_id!("G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ");

/// Our program's identity for VRF requests.
const PROGRAM_IDENTITY: Pubkey = program_identity_pubkey(&crate::ID);
/// The VRF signer on our callbacks, derived at COMPILE time. The SDK macro's
/// default check derives it at runtime (~270k CU), which exceeds the oracle's
/// 300k callback budget, so we declare the field ourselves.
const VRF_IDENTITY: Pubkey = Pubkey::new_from_array(scoped_vrf_identity_const(&crate::ID).0);

fn now() -> Result<i64> {
    Ok(Clock::get()?.unix_timestamp)
}

#[ephemeral]
#[program]
pub mod blindside {
    use super::*;

    // =====================================================================
    // Base layer
    // =====================================================================

    /// One-time setup: config, test-USDC mint and the vault.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.config.set_inner(Config {
            admin: ctx.accounts.admin.key(),
            mint: ctx.accounts.mint.key(),
            vault: ctx.accounts.vault.key(),
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    /// 100 test USDC, once an hour per wallet.
    pub fn faucet(ctx: Context<Faucet>) -> Result<()> {
        let now = now()?;
        let drip = &mut ctx.accounts.drip;
        require!(
            drip.last_ts == 0 || now - drip.last_ts >= FAUCET_COOLDOWN_S,
            BlindsideError::FaucetCooldown
        );
        drip.last_ts = now;
        drip.bump = ctx.bumps.drip;

        let seeds: &[&[u8]] = &[CONFIG_SEED, &[ctx.accounts.config.bump]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[seeds],
            ),
            FAUCET_AMOUNT,
        )
    }

    /// Admin: assign (or rotate) the key allowed to open rounds.
    pub fn set_keeper(ctx: Context<SetKeeper>, keeper: Pubkey) -> Result<()> {
        ctx.accounts.keeper_role.set_inner(KeeperRole {
            keeper,
            bump: ctx.bumps.keeper_role,
        });
        Ok(())
    }

    /// Create a round slot and a permission with no readers.
    pub fn init_slot(ctx: Context<InitSlot>, index: u8) -> Result<()> {
        require!((index as u64) < SLOTS, BlindsideError::WrongSlot);
        let bump = ctx.bumps.slot;
        {
            // Zeroed is an empty slot; just stamp its index and bump.
            let mut slot = ctx.accounts.slot.load_init()?;
            slot.index = index;
            slot.bump = bump;
        }

        CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .permissioned_account(&ctx.accounts.slot.to_account_info())
            .permission(&ctx.accounts.permission)
            .payer(&ctx.accounts.admin)
            .system_program(&ctx.accounts.system_program)
            // Some(empty) = private with no readers at all.
            .args(MembersArgs { members: Some(vec![]) })
            .invoke_signed(&[&[SLOT_SEED, &[index], &[bump]]])?;
        Ok(())
    }

    /// Hand a slot and its permission to the TEE validator.
    pub fn delegate_slot(ctx: Context<DelegateSlot>, index: u8) -> Result<()> {
        let (_, bump) = Pubkey::find_program_address(&[SLOT_SEED, &[index]], &crate::ID);
        ctx.accounts.delegate_slot(
            &ctx.accounts.admin,
            &[SLOT_SEED, &[index]],
            DelegateConfig {
                validator: Some(TEE_VALIDATOR),
                commit_frequency_ms: 0,
            },
        )?;
        DelegatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .payer(&ctx.accounts.admin)
            .authority(&ctx.accounts.slot, true)
            .permissioned_account(&ctx.accounts.slot, true)
            .permission(&ctx.accounts.permission)
            .system_program(&ctx.accounts.system_program)
            .owner_program(&ctx.accounts.permission_program)
            .delegation_buffer(&ctx.accounts.permission_buffer)
            .delegation_record(&ctx.accounts.permission_record)
            .delegation_metadata(&ctx.accounts.permission_metadata)
            .delegation_program(&ctx.accounts.delegation_program)
            .validator(Some(&ctx.accounts.validator))
            .invoke_signed(&[&[SLOT_SEED, &[index], &[bump]]])?;
        Ok(())
    }

    /// Create the player's balance account; only the player can read it.
    pub fn join(ctx: Context<Join>) -> Result<()> {
        let bump = ctx.bumps.player;
        let user = ctx.accounts.user.key();
        ctx.accounts.player.set_inner(Player {
            owner: user,
            balance: 0,
            pending: 0,
            bump,
        });
        CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .permissioned_account(&ctx.accounts.player.to_account_info())
            .permission(&ctx.accounts.permission)
            .payer(&ctx.accounts.user)
            .system_program(&ctx.accounts.system_program)
            .args(MembersArgs {
                members: Some(vec![Member {
                    flags: TX_LOGS_FLAG | TX_BALANCES_FLAG | TX_MESSAGE_FLAG,
                    pubkey: user,
                }]),
            })
            .invoke_signed(&[&[PLAYER_SEED, user.as_ref(), &[bump]]])?;
        Ok(())
    }

    /// Authorise a session key (base layer, signed by the wallet). Calls and
    /// leaving can then be signed by that key on the rollup. Replaces any
    /// earlier session.
    pub fn set_session(ctx: Context<SetSession>, key: Pubkey, expires_at: i64) -> Result<()> {
        require!(logic::session_expiry_ok(expires_at, now()?), BlindsideError::BadSession);
        let owner = ctx.accounts.user.key();
        ctx.accounts.session.set_inner(Session {
            owner,
            key,
            expires_at,
            bump: ctx.bumps.session,
        });
        Ok(())
    }

    /// Move test USDC from the wallet into the game. Base layer, while the
    /// player account isn't delegated.
    pub fn deposit(ctx: Context<MoveFunds>, amount: u64) -> Result<()> {
        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.user_ata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
            DECIMALS,
        )?;
        let p = &mut ctx.accounts.player;
        p.balance = p.balance.checked_add(amount).ok_or(BlindsideError::Overflow)?;
        Ok(())
    }

    /// Move test USDC back to the wallet. Base layer, after `leave`.
    pub fn withdraw(ctx: Context<MoveFunds>, amount: u64) -> Result<()> {
        let p = &mut ctx.accounts.player;
        require!(p.pending == 0, BlindsideError::PendingCalls);
        p.balance = p
            .balance
            .checked_sub(amount)
            .ok_or(BlindsideError::InsufficientBalance)?;
        let seeds: &[&[u8]] = &[CONFIG_SEED, &[ctx.accounts.config.bump]];
        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[seeds],
            ),
            amount,
            DECIMALS,
        )
    }

    /// Hand the player's balance (and, the first time, its permission) to
    /// the TEE validator so calls can be made there.
    pub fn delegate_player(ctx: Context<DelegatePlayer>) -> Result<()> {
        let user = ctx.accounts.user.key();
        let (_, bump) = Pubkey::find_program_address(&[PLAYER_SEED, user.as_ref()], &crate::ID);
        ctx.accounts.delegate_player(
            &ctx.accounts.user,
            &[PLAYER_SEED, user.as_ref()],
            DelegateConfig {
                validator: Some(TEE_VALIDATOR),
                commit_frequency_ms: 0,
            },
        )?;
        // The permission stays delegated after `leave`, so only do this once.
        if ctx.accounts.permission.owner == &PERMISSION_PROGRAM {
            DelegatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
                .payer(&ctx.accounts.user)
                .authority(&ctx.accounts.player, true)
                .permissioned_account(&ctx.accounts.player, true)
                .permission(&ctx.accounts.permission)
                .system_program(&ctx.accounts.system_program)
                .owner_program(&ctx.accounts.permission_program)
                .delegation_buffer(&ctx.accounts.permission_buffer)
                .delegation_record(&ctx.accounts.permission_record)
                .delegation_metadata(&ctx.accounts.permission_metadata)
                .delegation_program(&ctx.accounts.delegation_program)
                .validator(Some(&ctx.accounts.validator))
                .invoke_signed(&[&[PLAYER_SEED, user.as_ref(), &[bump]]])?;
        }
        Ok(())
    }

    // =====================================================================
    // Private Ephemeral Rollup
    // =====================================================================

    /// Start a round in its slot with the keeper's secret, making the slot
    /// private again if the previous round was revealed, and ask MagicBlock
    /// VRF for extra randomness. The secret travels in this transaction's
    /// message, which the private rollup hides.
    pub fn open_round(ctx: Context<OpenRound>, round: u64, secret: [u8; 32]) -> Result<()> {
        let (index, bump, was_public) = {
            let mut slot = ctx.accounts.slot.load_mut()?;
            let was_public = slot.status == STATUS_REVEALED;
            logic::open(&mut slot, round, now()?, secret)?;
            (slot.index, slot.bump, was_public)
        };
        if was_public {
            UpdatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
                .authority(&ctx.accounts.slot.to_account_info(), true)
                .permissioned_account(&ctx.accounts.slot.to_account_info(), true)
                .permission(&ctx.accounts.permission)
                .args(MembersArgs { members: Some(vec![]) })
                .invoke_signed(&[&[SLOT_SEED, &[index], &[bump]]])?;
        }

        // The request sits in a PUBLIC queue account, so its seed must not
        // contain the secret; it only needs to be unique per round.
        let mut caller_seed = [0u8; 32];
        caller_seed[..8].copy_from_slice(&round.to_le_bytes());
        caller_seed[8] = index;
        let ix = create_request_randomness_ix_const(
            RequestRandomnessParams {
                payer: ctx.accounts.keeper.key(),
                oracle_queue: ctx.accounts.oracle_queue.key(),
                callback_program_id: crate::ID,
                callback_discriminator: instruction::ConsumeRandomness::DISCRIMINATOR.to_vec(),
                caller_seed,
                accounts_metas: Some(vec![SerializableAccountMeta {
                    pubkey: ctx.accounts.slot.key(),
                    is_signer: false,
                    is_writable: true,
                }]),
                ..Default::default()
            },
            PROGRAM_IDENTITY,
        );
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.keeper.to_account_info(), &ix)?;
        Ok(())
    }

    /// VRF callback: stores the randomness if it arrived before 10 s.
    pub fn consume_randomness(ctx: Context<ConsumeRandomness>, randomness: [u8; 32]) -> Result<()> {
        logic::set_randomness(&mut *ctx.accounts.slot.load_mut()?, &randomness, now()?);
        Ok(())
    }

    /// Steady-rate keeper call: records the starting and result prices at
    /// the right moments. Always succeeds.
    pub fn tick(ctx: Context<Tick>) -> Result<()> {
        let data = ctx.accounts.feed.try_borrow_data()?;
        let (price, publish) = logic::read_feed(&data).unwrap_or((0, 0));
        drop(data);
        logic::tick(&mut *ctx.accounts.slot.load_mut()?, now()?, price, publish);
        Ok(())
    }

    /// Make a call. Debits the stake now; late calls are refunded at the reveal.
    /// `nonce` is random bytes from the player's device (mixed into the close).
    pub fn place_call(
        ctx: Context<PlaceCall>,
        round: u64,
        side: u8,
        amount: u64,
        nonce: [u8; 32],
    ) -> Result<()> {
        let player = &mut ctx.accounts.player;
        require!(player.balance >= amount, BlindsideError::InsufficientBalance);
        logic::place_call(
            &mut *ctx.accounts.slot.load_mut()?,
            round,
            now()?,
            player.owner,
            side,
            amount,
            nonce,
        )?;
        player.balance -= amount;
        player.pending = player.pending.checked_add(1).ok_or(BlindsideError::Overflow)?;
        Ok(())
    }

    /// `place_call`, signed by the player's session key instead of the wallet.
    pub fn place_call_session(
        ctx: Context<PlaceCallSession>,
        round: u64,
        side: u8,
        amount: u64,
        nonce: [u8; 32],
    ) -> Result<()> {
        require!(
            logic::session_ok(ctx.accounts.session.expires_at, now()?),
            BlindsideError::BadSession
        );
        let player = &mut ctx.accounts.player;
        require!(player.balance >= amount, BlindsideError::InsufficientBalance);
        logic::place_call(
            &mut *ctx.accounts.slot.load_mut()?,
            round,
            now()?,
            player.owner,
            side,
            amount,
            nonce,
        )?;
        player.balance -= amount;
        player.pending = player.pending.checked_add(1).ok_or(BlindsideError::Overflow)?;
        Ok(())
    }

    /// At 80 s: decide the outcome and make the whole round public.
    pub fn reveal(ctx: Context<Reveal>) -> Result<()> {
        let (index, bump) = {
            let mut slot = ctx.accounts.slot.load_mut()?;
            logic::reveal(&mut slot, now()?)?;
            (slot.index, slot.bump)
        };
        UpdatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .authority(&ctx.accounts.slot.to_account_info(), true)
            .permissioned_account(&ctx.accounts.slot.to_account_info(), true)
            .permission(&ctx.accounts.permission)
            // None = public.
            .args(MembersArgs { members: None })
            .invoke_signed(&[&[SLOT_SEED, &[index], &[bump]]])?;
        Ok(())
    }

    /// Pay a player's call out to their balance. Anyone can call it.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let owner = ctx.accounts.player.owner;
        let amount = logic::claim(&mut *ctx.accounts.slot.load_mut()?, owner)?;
        let p = &mut ctx.accounts.player;
        p.balance = p.balance.checked_add(amount).ok_or(BlindsideError::Overflow)?;
        p.pending = p.pending.saturating_sub(1);
        Ok(())
    }

    /// Bring the player's balance back to the base layer so it can be withdrawn.
    pub fn leave(ctx: Context<Leave>) -> Result<()> {
        require!(ctx.accounts.player.pending == 0, BlindsideError::PendingCalls);
        ctx.accounts.player.exit(&crate::ID)?;
        commit_and_undelegate_accounts(
            &ctx.accounts.user,
            vec![&ctx.accounts.player.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
            None,
        )?;
        Ok(())
    }

    /// `leave`, signed by the player's session key. The balance goes back to
    /// the player's own account on Solana; only the wallet can withdraw it.
    pub fn leave_session(ctx: Context<LeaveSession>) -> Result<()> {
        require!(
            logic::session_ok(ctx.accounts.session.expires_at, now()?),
            BlindsideError::BadSession
        );
        require!(ctx.accounts.player.pending == 0, BlindsideError::PendingCalls);
        ctx.accounts.player.exit(&crate::ID)?;
        commit_and_undelegate_accounts(
            &ctx.accounts.session_key,
            vec![&ctx.accounts.player.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
            None,
        )?;
        Ok(())
    }
}

// =========================================================================
// Accounts
// =========================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = admin,
        seeds = [MINT_SEED],
        bump,
        mint::decimals = DECIMALS,
        mint::authority = config,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [VAULT_SEED],
        bump,
        token::mint = mint,
        token::authority = config,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Faucet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Drip::INIT_SPACE,
        seeds = [DRIP_SEED, user.key().as_ref()],
        bump,
    )]
    pub drip: Account<'info, Drip>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct InitSlot<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(init, payer = admin, space = 8 + Slot::SIZE, seeds = [SLOT_SEED, &[index]], bump)]
    pub slot: AccountLoader<'info, Slot>,
    /// CHECK: permission PDA for `slot`, created by the permission program.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(index: u8)]
pub struct DelegateSlot<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    /// CHECK: the slot PDA being delegated.
    #[account(mut, del, seeds = [SLOT_SEED, &[index]], bump)]
    pub slot: AccountInfo<'info>,
    /// CHECK: permission PDA for `slot`.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: delegation buffer for the permission PDA.
    #[account(mut)]
    pub permission_buffer: UncheckedAccount<'info>,
    /// CHECK: delegation record for the permission PDA.
    #[account(mut)]
    pub permission_record: UncheckedAccount<'info>,
    /// CHECK: delegation metadata for the permission PDA.
    #[account(mut)]
    pub permission_metadata: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: the TEE validator.
    #[account(address = TEE_VALIDATOR)]
    pub validator: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Join<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + Player::INIT_SPACE,
        seeds = [PLAYER_SEED, user.key().as_ref()],
        bump,
    )]
    pub player: Account<'info, Player>,
    /// CHECK: permission PDA for `player`, created by the permission program.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// Deposit / withdraw. `Account<Player>` requires this program to own the
/// account, so both fail while it's delegated to the rollup.
#[derive(Accounts)]
pub struct MoveFunds<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, user.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == user.key(),
    )]
    pub player: Account<'info, Player>,
    #[account(address = config.mint)]
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = user)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegatePlayer<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: the player PDA being delegated.
    #[account(mut, del, seeds = [PLAYER_SEED, user.key().as_ref()], bump)]
    pub player: AccountInfo<'info>,
    /// CHECK: permission PDA for `player`.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: delegation buffer for the permission PDA.
    #[account(mut)]
    pub permission_buffer: UncheckedAccount<'info>,
    /// CHECK: delegation record for the permission PDA.
    #[account(mut)]
    pub permission_record: UncheckedAccount<'info>,
    /// CHECK: delegation metadata for the permission PDA.
    #[account(mut)]
    pub permission_metadata: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: the TEE validator.
    #[account(address = TEE_VALIDATOR)]
    pub validator: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SetKeeper<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + KeeperRole::INIT_SPACE,
        seeds = [KEEPER_SEED],
        bump,
    )]
    pub keeper_role: Account<'info, KeeperRole>,
    pub system_program: Program<'info, System>,
}

#[vrf]
#[derive(Accounts)]
pub struct OpenRound<'info> {
    /// The keeper: only it can seed a round's secret. Also pays for VRF.
    #[account(mut)]
    pub keeper: Signer<'info>,
    #[account(seeds = [KEEPER_SEED], bump = keeper_role.bump, has_one = keeper)]
    pub keeper_role: Account<'info, KeeperRole>,
    #[account(mut, seeds = [SLOT_SEED, &[slot.load()?.index]], bump = slot.load()?.bump)]
    pub slot: AccountLoader<'info, Slot>,
    /// CHECK: permission PDA for `slot`; the permission program checks it.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: MagicBlock's ephemeral VRF queue.
    #[account(mut, address = DEFAULT_EPHEMERAL_QUEUE)]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback]
#[derive(Accounts)]
pub struct ConsumeRandomness<'info> {
    /// Declared here (compile-time address) so the macro doesn't add its
    /// expensive runtime-derived check.
    #[account(address = VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut, seeds = [SLOT_SEED, &[slot.load()?.index]], bump = slot.load()?.bump)]
    pub slot: AccountLoader<'info, Slot>,
}

#[derive(Accounts)]
pub struct Tick<'info> {
    #[account(mut, seeds = [SLOT_SEED, &[slot.load()?.index]], bump = slot.load()?.bump)]
    pub slot: AccountLoader<'info, Slot>,
    /// CHECK: the SOL/USD price feed; layout read in `logic::read_feed`.
    #[account(address = SOL_USD_FEED, owner = PRICE_PROGRAM @ BlindsideError::BadFeed)]
    pub feed: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct PlaceCall<'info> {
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, user.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == user.key(),
    )]
    pub player: Account<'info, Player>,
    #[account(
        mut,
        seeds = [SLOT_SEED, &[logic::slot_index(round)]],
        bump = slot.load()?.bump,
    )]
    pub slot: AccountLoader<'info, Slot>,
}

#[derive(Accounts)]
pub struct Reveal<'info> {
    #[account(mut, seeds = [SLOT_SEED, &[slot.load()?.index]], bump = slot.load()?.bump)]
    pub slot: AccountLoader<'info, Slot>,
    /// CHECK: permission PDA for `slot`; the permission program checks it.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, seeds = [SLOT_SEED, &[slot.load()?.index]], bump = slot.load()?.bump)]
    pub slot: AccountLoader<'info, Slot>,
    #[account(mut, seeds = [PLAYER_SEED, player.owner.as_ref()], bump = player.bump)]
    pub player: Account<'info, Player>,
}

#[commit]
#[derive(Accounts)]
pub struct Leave<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, user.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == user.key(),
    )]
    pub player: Account<'info, Player>,
}

#[derive(Accounts)]
pub struct SetSession<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Session::INIT_SPACE,
        seeds = [SESSION_SEED, user.key().as_ref()],
        bump,
    )]
    pub session: Account<'info, Session>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct PlaceCallSession<'info> {
    pub session_key: Signer<'info>,
    #[account(
        seeds = [SESSION_SEED, session.owner.as_ref()],
        bump = session.bump,
        constraint = session.key == session_key.key() @ BlindsideError::BadSession,
    )]
    pub session: Account<'info, Session>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, session.owner.as_ref()],
        bump = player.bump,
        constraint = player.owner == session.owner @ BlindsideError::BadSession,
    )]
    pub player: Account<'info, Player>,
    #[account(
        mut,
        seeds = [SLOT_SEED, &[logic::slot_index(round)]],
        bump = slot.load()?.bump,
    )]
    pub slot: AccountLoader<'info, Slot>,
}

#[commit]
#[derive(Accounts)]
pub struct LeaveSession<'info> {
    #[account(mut)]
    pub session_key: Signer<'info>,
    #[account(
        seeds = [SESSION_SEED, session.owner.as_ref()],
        bump = session.bump,
        constraint = session.key == session_key.key() @ BlindsideError::BadSession,
    )]
    pub session: Account<'info, Session>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, session.owner.as_ref()],
        bump = player.bump,
        constraint = player.owner == session.owner @ BlindsideError::BadSession,
    )]
    pub player: Account<'info, Player>,
}
