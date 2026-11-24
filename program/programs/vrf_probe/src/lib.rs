//! Throwaway probe: does MagicBlock VRF fulfil requests made inside the devnet
//! TEE (Private Ephemeral Rollup)? Two targets, both delegated to the TEE:
//!   kind 0: public (no permission)
//!   kind 1: private (permission readable only by the admin), like a Blindside slot
//! `request` asks VRF to call `consume`, which stores the randomness and counts.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::access_control::instructions::{
    CreatePermissionCpiBuilder, DelegatePermissionCpiBuilder,
};
use ephemeral_rollups_sdk::access_control::structs::{Member, MembersArgs};
use ephemeral_rollups_sdk::anchor::{delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_vrf_sdk::anchor::{vrf, vrf_callback};
use ephemeral_vrf_sdk::consts::{program_identity_pubkey, scoped_vrf_identity_const, DEFAULT_EPHEMERAL_QUEUE};
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix_const, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

declare_id!("5QcW1XMWQbZAh1CHKGfZcagJ7jgZ5EiMofG7bqSwnsBi");

pub const TEE_VALIDATOR: Pubkey = pubkey!("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
pub const PERMISSION_PROGRAM: Pubkey = pubkey!("ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1");
pub const SEED: &[u8] = b"target";
const PROGRAM_IDENTITY: Pubkey = program_identity_pubkey(&crate::ID);
/// The VRF signer for our callbacks, derived at COMPILE time. The macro's
/// default check derives it at runtime with software curve maths (~270k CU),
/// which blows the oracle's 300k callback budget.
const VRF_IDENTITY: Pubkey = Pubkey::new_from_array(scoped_vrf_identity_const(&crate::ID).0);

#[ephemeral]
#[program]
pub mod vrf_probe {
    use super::*;

    /// Base layer: create a target (kind 1 also gets an admin-only permission).
    pub fn init(ctx: Context<Init>, kind: u8) -> Result<()> {
        let t = &mut ctx.accounts.target;
        t.kind = kind;
        t.count = 0;
        t.value = [0; 32];
        t.bump = ctx.bumps.target;
        if kind == 1 {
            let admin = ctx.accounts.admin.key();
            CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
                .permissioned_account(&ctx.accounts.target.to_account_info())
                .permission(&ctx.accounts.permission)
                .payer(&ctx.accounts.admin)
                .system_program(&ctx.accounts.system_program)
                .args(MembersArgs {
                    members: Some(vec![Member { flags: 0b1110, pubkey: admin }]),
                })
                .invoke_signed(&[&[SEED, &[kind], &[ctx.bumps.target]]])?;
        }
        Ok(())
    }

    /// Base layer: delegate the target (and its permission) to the TEE validator.
    pub fn delegate_target(ctx: Context<DelegateTarget>, kind: u8) -> Result<()> {
        ctx.accounts.delegate_target(
            &ctx.accounts.admin,
            &[SEED, &[kind]],
            DelegateConfig { validator: Some(TEE_VALIDATOR), commit_frequency_ms: 0 },
        )?;
        if kind == 1 {
            let (_, bump) = Pubkey::find_program_address(&[SEED, &[kind]], &crate::ID);
            DelegatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
                .payer(&ctx.accounts.admin)
                .authority(&ctx.accounts.target, true)
                .permissioned_account(&ctx.accounts.target, true)
                .permission(&ctx.accounts.permission)
                .system_program(&ctx.accounts.system_program)
                .owner_program(&ctx.accounts.permission_program)
                .delegation_buffer(&ctx.accounts.permission_buffer)
                .delegation_record(&ctx.accounts.permission_record)
                .delegation_metadata(&ctx.accounts.permission_metadata)
                .delegation_program(&ctx.accounts.delegation_program)
                .validator(Some(&ctx.accounts.validator))
                .invoke_signed(&[&[SEED, &[kind], &[bump]]])?;
        }
        Ok(())
    }

    /// Rollup: ask VRF to call `consume` with randomness for this target.
    pub fn request(ctx: Context<Request>, client_seed: u8) -> Result<()> {
        let ix = create_request_randomness_ix_const(
            RequestRandomnessParams {
                payer: ctx.accounts.payer.key(),
                oracle_queue: ctx.accounts.oracle_queue.key(),
                callback_program_id: crate::ID,
                callback_discriminator: instruction::Consume::DISCRIMINATOR.to_vec(),
                caller_seed: [client_seed; 32],
                accounts_metas: Some(vec![SerializableAccountMeta {
                    pubkey: ctx.accounts.target.key(),
                    is_signer: false,
                    is_writable: true,
                }]),
                ..Default::default()
            },
            PROGRAM_IDENTITY,
        );
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    /// VRF callback.
    pub fn consume(ctx: Context<Consume>, randomness: [u8; 32]) -> Result<()> {
        let t = &mut ctx.accounts.target;
        t.value = randomness;
        t.count = t.count.wrapping_add(1);
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Target {
    pub kind: u8,
    pub count: u32,
    pub value: [u8; 32],
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(kind: u8)]
pub struct Init<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Target::INIT_SPACE, seeds = [SEED, &[kind]], bump)]
    pub target: Account<'info, Target>,
    /// CHECK: permission PDA (only used for kind 1).
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(kind: u8)]
pub struct DelegateTarget<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: the target PDA.
    #[account(mut, del, seeds = [SEED, &[kind]], bump)]
    pub target: AccountInfo<'info>,
    /// CHECK: permission PDA.
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: delegation buffer for the permission.
    #[account(mut)]
    pub permission_buffer: UncheckedAccount<'info>,
    /// CHECK: delegation record for the permission.
    #[account(mut)]
    pub permission_record: UncheckedAccount<'info>,
    /// CHECK: delegation metadata for the permission.
    #[account(mut)]
    pub permission_metadata: UncheckedAccount<'info>,
    /// CHECK: MagicBlock permission program.
    #[account(address = PERMISSION_PROGRAM)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: the TEE validator.
    #[account(address = TEE_VALIDATOR)]
    pub validator: UncheckedAccount<'info>,
}

#[vrf]
#[derive(Accounts)]
pub struct Request<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [SEED, &[target.kind]], bump = target.bump)]
    pub target: Account<'info, Target>,
    /// CHECK: MagicBlock's ephemeral VRF queue.
    #[account(mut, address = DEFAULT_EPHEMERAL_QUEUE)]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback]
#[derive(Accounts)]
pub struct Consume<'info> {
    /// Declared here so the macro doesn't add its runtime-derived check.
    #[account(address = VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub target: Account<'info, Target>,
}
