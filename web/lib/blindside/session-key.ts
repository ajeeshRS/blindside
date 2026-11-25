"use client";

import { Keypair } from "@solana/web3.js";

/*
 * Session keys. A wallet extension authorises a temporary key once, in a
 * normal devnet transaction (`set_session`). That key, kept in this browser,
 * then signs the rollup transactions: calls and leaving. Wallets never see a
 * transaction with a rollup blockhash (which some, like Solflare, refuse as a
 * "network mismatch"), and calls become one tap with no pop-up.
 *
 * The key can only place calls and bring the balance back to the player's own
 * account on Solana. Withdrawing to the wallet still needs the wallet.
 */

/** How long a new session key stays valid (the program allows up to 7 days). */
export const SESSION_TTL_S = 3 * 24 * 60 * 60;
/** Renew a little before expiry, so a call never lands on an expired key. */
const RENEW_BEFORE_S = 10 * 60;

type Stored = { secret: number[]; expiresAt: number; token?: string; tokenExpiresAt?: number };

const keyFor = (owner: string) => `blindside:session:${owner}`;

export type SessionKey = {
  keypair: Keypair;
  /** Unix seconds. */
  expiresAt: number;
  /** Rollup login token for the session key, if we have a fresh one. */
  token: string | null;
};

function read(owner: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(keyFor(owner));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function write(owner: string, s: Stored) {
  try {
    window.localStorage.setItem(keyFor(owner), JSON.stringify(s));
  } catch {
    // Not persisted: the wallet will authorise a new key next visit.
  }
}

/** A stored, still-valid session key for this wallet, or null. */
export function loadSessionKey(owner: string): SessionKey | null {
  const s = read(owner);
  if (!s || s.expiresAt - RENEW_BEFORE_S <= Date.now() / 1000) return null;
  const fresh = s.token && (s.tokenExpiresAt ?? 0) > Date.now() + 60_000;
  return {
    keypair: Keypair.fromSecretKey(Uint8Array.from(s.secret)),
    expiresAt: s.expiresAt,
    token: fresh ? s.token! : null,
  };
}

export function saveSessionKey(owner: string, keypair: Keypair, expiresAt: number) {
  write(owner, { secret: Array.from(keypair.secretKey), expiresAt });
}

export function saveSessionToken(owner: string, token: string, tokenExpiresAt: number) {
  const s = read(owner);
  if (s) write(owner, { ...s, token, tokenExpiresAt });
}
