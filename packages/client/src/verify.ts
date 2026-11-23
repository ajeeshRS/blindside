import { sha256 } from "@noble/hashes/sha256";
import { PublicKey } from "@solana/web3.js";
import { ROUND } from "./constants";

type Bytes = Uint8Array | number[];
const concat = (...parts: Bytes[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};

/**
 * Recompute a revealed round's close (seconds after the start) from its
 * public secret and the calls mixed into it — the same steps as
 * `logic::recompute_offset` in the program. Anyone can run this.
 */
export function recomputeOffset(
  secret: Bytes,
  calls: { player: PublicKey; nonce: Bytes }[],
): number {
  let e = sha256(concat(new TextEncoder().encode("blindside"), secret));
  for (const c of calls) e = sha256(concat(e, c.player.toBytes(), c.nonce));
  let r = 0n;
  for (let i = 7; i >= 0; i--) r = (r << 8n) | BigInt(e[i]);
  const span = BigInt(ROUND.closeMax - ROUND.closeMin + 1);
  return ROUND.closeMin + Number(r % span);
}
