"use client";

import {
  createProgram,
  keypairSigner,
  keypairWallet,
  OUTCOME,
  readSlot,
  recomputeOffset,
  ROUND,
  roundStart,
  slotIndex,
  STATUS,
  teeConnection,
  teeLogin,
  VOID_REASON,
  type BlindsideProgram,
  type SlotAccount,
} from "@blindside/client";
import { Keypair, type PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

/**
 * Reading a revealed round needs a login to the private rollup, but not a
 * wallet: an anonymous throwaway key, made in the browser, is enough. Anyone
 * can see results and verify the close.
 */
let reader: Promise<BlindsideProgram> | null = null;
export function getReader() {
  if (!reader) {
    reader = (async () => {
      const kp = Keypair.generate();
      const { token } = await teeLogin(keypairSigner(kp));
      return createProgram(teeConnection(token), keypairWallet(kp));
    })().catch((e) => {
      reader = null;
      throw e;
    });
  }
  return reader;
}

export type RoundResult = {
  round: number;
  closeS: number;
  /** Close recomputed from the public secret and nonces matches the program's. */
  verified: boolean;
  strike: number | null;
  settle: number | null;
  outcome: "up" | "down" | "void";
  voidReason: string;
  upPool: number;
  downPool: number;
  calls: { player: PublicKey; side: number; amount: number; late: boolean; claimed: boolean }[];
  slot: SlotAccount;
};

const usd = (raw: { toNumber(): number }) => raw.toNumber() / 1e8;

export function toResult(slot: SlotAccount): RoundResult {
  const n = slot.callCount;
  const calls = slot.calls.slice(0, n);
  return {
    round: slot.round.toNumber(),
    closeS: slot.offsetS,
    verified: recomputeOffset(slot.secret, calls.slice(0, slot.seedCalls)) === slot.offsetS,
    strike: slot.strikeTs.toNumber() ? usd(slot.strike) : null,
    settle: slot.settleTs.toNumber() ? usd(slot.settle) : null,
    outcome: slot.outcome === OUTCOME.up ? "up" : slot.outcome === OUTCOME.down ? "down" : "void",
    voidReason: VOID_REASON[slot.voidReason] ?? "",
    upPool: slot.upPool.toNumber() / 1e6,
    downPool: slot.downPool.toNumber() / 1e6,
    calls: calls.map((c) => ({
      player: c.player,
      side: c.side,
      amount: c.amount.toNumber() / 1e6,
      late: c.late === 1,
      claimed: c.claimed === 1,
    })),
    slot,
  };
}

/** A round's revealed result, or null until it's public (or once its slot is reused). */
export async function fetchResult(round: number): Promise<RoundResult | null> {
  const r = await getReader();
  const slot = await readSlot(r, slotIndex(round));
  if (!slot || slot.round.toNumber() !== round || slot.status !== STATUS.revealed) return null;
  return toResult(slot);
}

/** Poll for a round's result from its reveal time. */
export function useRoundResult(round: number | null) {
  const [result, setResult] = useState<RoundResult | null>(null);
  useEffect(() => {
    setResult(null);
    if (round === null) return;
    let stop = false;
    const tick = async () => {
      const revealAt = (roundStart(round) + ROUND.reveal) * 1000;
      if (Date.now() < revealAt) return;
      const r = await fetchResult(round).catch(() => null);
      if (!stop && r) {
        setResult(r);
        stop = true;
      }
    };
    void tick();
    const id = setInterval(() => !stop && void tick(), 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [round]);
  return result;
}

/** What a call paid back, mirroring the program's payout rule. */
export function payoutFor(r: RoundResult, side: number, amount: number, late: boolean) {
  if (r.outcome === "void" || late) return amount;
  const win = (r.outcome === "up" ? 1 : 2) === side;
  if (!win) return 0;
  const [w, l] = r.outcome === "up" ? [r.upPool, r.downPool] : [r.downPool, r.upPool];
  return amount + (w > 0 ? (amount * l) / w : 0);
}
