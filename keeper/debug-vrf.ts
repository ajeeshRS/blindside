/**
 * Diagnostic: open the next round and watch whether the VRF request lands
 * and whether the oracle answers on the private rollup.
 *
 *   pnpm --filter @blindside/keeper exec tsx debug-vrf.ts
 */
import { PublicKey } from "@solana/web3.js";
import { currentRound, nowS, openRound, roundStart, sleep, sleepUntil, slotIndex, ROUND } from "@blindside/client";
import { loadKeypair, teeProgramFor } from "@blindside/client/node";

const QUEUE = new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc");

async function main() {
  const tee = await teeProgramFor(loadKeypair());
  const conn = tee.provider.connection;
  let round = currentRound() + 1;
  if (roundStart(round) - nowS() > ROUND.openLead - 5) await sleepUntil(roundStart(round) - 50);
  if (roundStart(round) - nowS() < 15) round += 1, await sleepUntil(roundStart(round) - 50);
  console.log("round", round, "slot", slotIndex(round), "starts in", roundStart(round) - nowS(), "s");

  const before = new Set((await conn.getSignaturesForAddress(QUEUE, { limit: 20 })).map((s) => s.signature));
  const queueBefore = (await conn.getAccountInfo(QUEUE))?.data;

  const sig = await openRound(tee, round);
  console.log("open_round sig", sig);
  const status = await conn.getSignatureStatus(sig, { searchTransactionHistory: true });
  console.log("open_round status", JSON.stringify(status.value));
  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
  console.log("open_round err", JSON.stringify(tx?.meta?.err), "\nlogs:\n ", (tx?.meta?.logMessages ?? []).join("\n  "));

  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    const q = (await conn.getAccountInfo(QUEUE))?.data;
    const changed = q && queueBefore ? !Buffer.from(q).equals(Buffer.from(queueBefore)) : "?";
    const sigs = (await conn.getSignaturesForAddress(QUEUE, { limit: 20 })).filter((s) => !before.has(s.signature));
    console.log(`t+${(i + 1) * 2.5}s queue changed=${changed} new queue txs=${sigs.length}`);
    for (const s of sigs) {
      before.add(s.signature);
      const t = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 }).catch(() => null);
      console.log("  ", s.signature.slice(0, 20), "err", JSON.stringify(s.err), (t?.meta?.logMessages ?? []).slice(-6).join(" | "));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
