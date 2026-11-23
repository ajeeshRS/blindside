/**
 * The keeper runs the round clock on the private rollup. Every step it takes
 * is permissionless and time-gated by the program, so the keeper can't steer
 * a round; if it stops, rounds void and refund instead of settling late.
 *
 *   - opens the next round ~30 s before it starts (VRF picks the hidden close)
 *   - ticks every live round at a steady rate (records the prices)
 *   - reveals each round at 80 s
 *   - pays out every call after the reveal
 *
 *   pnpm keeper
 */
import {
  claim,
  currentRound,
  nowS,
  openRound,
  readSlot,
  reveal,
  ROUND,
  roundStart,
  sleep,
  slotIndex,
  STATUS,
  tick,
  type BlindsideProgram,
} from "@blindside/client";
import { loadKeypair, teeProgramFor } from "@blindside/client/node";

const TICK_MS = 400;
const OPEN_BEFORE_S = 30;

type Job = { opened: boolean; revealed: boolean; paid: boolean };

export async function runKeeper(tee: BlindsideProgram, opts: { log?: boolean; until?: () => boolean } = {}) {
  const log = (...a: unknown[]) => opts.log !== false && console.log(new Date().toISOString(), ...a);
  const jobs = new Map<number, Job>();
  const job = (r: number) => {
    if (!jobs.has(r)) jobs.set(r, { opened: false, revealed: false, paid: false });
    return jobs.get(r)!;
  };

  // Steady ticks for every round that could still need a price.
  const ticker = setInterval(() => {
    const r = currentRound();
    const t = nowS() - roundStart(r);
    // Round r needs ticks from its start until ~85 s (close ≤ 50 s, +30 s, +gap).
    // Ticking a slot that isn't running is a harmless no-op, so this also covers
    // rounds opened by another keeper or before a restart.
    if (t < ROUND.closeMax + ROUND.hold + 5) tick(tee, slotIndex(r)).catch(() => {});
  }, TICK_MS);

  try {
    while (!opts.until?.()) {
      const r = currentRound();
      const next = r + 1;
      const t = nowS();

      // Open the next round shortly before it starts.
      if (!job(next).opened && t >= roundStart(next) - OPEN_BEFORE_S) {
        try {
          await openRound(tee, next);
          job(next).opened = true;
          log(`opened round ${next} (slot ${slotIndex(next)})`);
        } catch (e) {
          log(`open ${next} failed:`, (e as Error).message.slice(0, 160));
          // Don't retry every loop, and don't try to reveal a round we couldn't open.
          job(next).opened = true;
          job(next).paid = true;
        }
      }

      // Reveal and pay out rounds whose reveal time has passed.
      for (const round of [r - 1, r]) {
        const j = job(round);
        if (!j.opened || j.paid || t < roundStart(round) + ROUND.reveal) continue;
        const index = slotIndex(round);
        if (!j.revealed) {
          try {
            await reveal(tee, index);
            j.revealed = true;
            log(`revealed round ${round}`);
          } catch (e) {
            log(`reveal ${round} failed:`, (e as Error).message.slice(0, 160));
          }
        }
        if (j.revealed) {
          const slot = await readSlot(tee, index);
          if (slot && slot.status === STATUS.revealed && slot.round.toNumber() === round) {
            const unpaid = slot.calls.slice(0, slot.callCount).filter((c) => !c.claimed);
            for (const c of unpaid) {
              await claim(tee, index, c.player).catch((e) =>
                log(`claim ${c.player.toBase58()} failed:`, (e as Error).message.slice(0, 120)),
              );
            }
            const after = await readSlot(tee, index);
            if (after && after.claimedCount === after.callCount) {
              j.paid = true;
              log(`paid round ${round}: ${after.callCount} calls, outcome ${after.outcome}`);
            }
          }
        }
      }

      for (const k of jobs.keys()) if (k < r - 2) jobs.delete(k);
      await sleep(500);
    }
  } finally {
    clearInterval(ticker);
  }
}

if (require.main === module) {
  (async () => {
    const tee = await teeProgramFor(loadKeypair());
    console.log("keeper running as", tee.provider.publicKey!.toBase58());
    await runKeeper(tee);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
