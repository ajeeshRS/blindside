import { BN } from "@coral-xyz/anchor";
import { permissionPdaFromAccount } from "@magicblock-labs/ephemeral-rollups-sdk";
import { PublicKey } from "@solana/web3.js";
import { ONE_USDC, SOL_USD_FEED } from "./constants";
import { slotIndex } from "./clock";
import { mintPda, permissionAccounts, playerPda, slotPda, userAta, vaultPda } from "./pdas";
import type { BlindsideProgram } from "./program";

/** Rollup transactions: skip preflight (simulation can't see private accounts). */
const ER_OPTS = { skipPreflight: true, commitment: "confirmed" } as const;
const usdc = (amount: number) => new BN(Math.round(amount * ONE_USDC));
const me = (p: BlindsideProgram) => p.provider.publicKey!;
const random32 = () => Array.from(crypto.getRandomValues(new Uint8Array(32)));

// ---------------- base layer ----------------

export const faucet = (base: BlindsideProgram) =>
  base.methods.faucet().accounts({ user: me(base), mint: mintPda() }).rpc();

export const join = (base: BlindsideProgram) =>
  base.methods
    .join()
    .accountsPartial({ user: me(base), permission: permissionAccounts(playerPda(me(base))).permission })
    .rpc();

const fundsAccounts = (user: PublicKey) => ({
  user,
  mint: mintPda(),
  vault: vaultPda(),
  userAta: userAta(user),
});

export const deposit = (base: BlindsideProgram, amountUsdc: number) =>
  base.methods.deposit(usdc(amountUsdc)).accountsPartial(fundsAccounts(me(base))).rpc();

/** Withdraw raw base units (use the balance read from the player account). */
export const withdrawRaw = (base: BlindsideProgram, amount: BN) =>
  base.methods.withdraw(amount).accountsPartial(fundsAccounts(me(base))).rpc();

export function delegatePlayer(base: BlindsideProgram) {
  const p = permissionAccounts(playerPda(me(base)));
  return base.methods
    .delegatePlayer()
    .accountsPartial({
      user: me(base),
      permission: p.permission,
      permissionBuffer: p.permissionBuffer,
      permissionRecord: p.permissionRecord,
      permissionMetadata: p.permissionMetadata,
    })
    .rpc();
}

// ---------------- private rollup ----------------

/** Admin only (base layer): assign the key allowed to open rounds. */
export const setKeeper = (base: BlindsideProgram, keeper: PublicKey) =>
  base.methods.setKeeper(keeper).accounts({ admin: me(base) }).rpc();

/** Keeper only: opens a round with a fresh random secret. */
export const openRound = (tee: BlindsideProgram, round: number) =>
  tee.methods
    .openRound(new BN(round), random32())
    .accountsPartial({
      keeper: me(tee),
      slot: slotPda(slotIndex(round)),
      permission: permissionPdaFromAccount(slotPda(slotIndex(round))),
    })
    .rpc(ER_OPTS);

export const tick = (tee: BlindsideProgram, index: number) =>
  tee.methods.tick().accountsPartial({ slot: slotPda(index), feed: SOL_USD_FEED }).rpc(ER_OPTS);

/** Each call carries a random nonce that feeds the hidden close. */
export const placeCall = (tee: BlindsideProgram, round: number, side: number, amountUsdc: number) =>
  tee.methods
    .placeCall(new BN(round), side, usdc(amountUsdc), random32())
    .accountsPartial({
      user: me(tee),
      player: playerPda(me(tee)),
      slot: slotPda(slotIndex(round)),
    })
    .rpc(ER_OPTS);

export const reveal = (tee: BlindsideProgram, index: number) =>
  tee.methods
    .reveal()
    .accountsPartial({ slot: slotPda(index), permission: permissionPdaFromAccount(slotPda(index)) })
    .rpc(ER_OPTS);

export const claim = (tee: BlindsideProgram, index: number, owner: PublicKey) =>
  tee.methods.claim().accountsPartial({ slot: slotPda(index), player: playerPda(owner) }).rpc(ER_OPTS);

/** Bring the player's balance back to the base layer (then `withdrawRaw`). */
export const leave = (tee: BlindsideProgram) =>
  tee.methods.leave().accountsPartial({ user: me(tee) }).rpc(ER_OPTS);
