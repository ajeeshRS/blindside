/**
 * The keeper runs the round clock on the private rollup. Only opening needs
 * its key (it seeds each round's secret); ticking, revealing and paying out
 * are permissionless and time-gated by the program. If it stops, rounds void
 * and refund instead of settling late.
 *
 *   - opens the next round ~30 s before it starts, with a fresh random secret
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
import { loadKeeperKeypair, teeProgramFor } from "@blindside/client/node";

const TICK_MS = 400;
/** Open each round this long before it starts... */
const OPEN_BEFORE_S = 30;
/** ...and keep retrying until just before the program's open window closes (start + 5 s). */
const OPEN_UNTIL_S = 4;
const SWEEP_EVERY_MS = 5_000;

export async function runKeeper(tee: BlindsideProgram, opts: { log?: boolean; until?: () => boolean } = {}) {
  const log = (...a: unknown[]) => opts.log !== false && console.log(new Date().toISOString(), ...a);
  const opened = new Set<number>();
  const paidLogged = new Set<number>();
  const msg = (e: unknown) => (e as Error).message.slice(0, 140);

  // Steady ticks for the running round. Ticking a slot that isn't running is a
  // harmless no-op, so this also covers rounds opened before a restart.
  const ticker = setInterval(() => {
    const r = currentRound();
    const t = nowS() - roundStart(r);
    if (t < ROUND.closeMax + ROUND.hold + 5) tick(tee, slotIndex(r)).catch(() => {});
  }, TICK_MS);

  /**
   * Bring one slot to rest: if it's public (revealed), pay out any unpaid
   * calls; if it's private and its round is past the reveal time, reveal it.
   * This also rescues rounds whose open "failed" on our side but landed, which
   * would otherwise leave the slot stuck and block every 8th round after it.
   */
  async function settleSlot(index: number) {
    const r = currentRound();
    const next = r + 1;
    const slot = await readSlot(tee, index).catch(() => null);

    if (!slot) {
      // Private: the running round, the next round (opened early), or a stuck one.
      if (index === slotIndex(next) && nowS() >= roundStart(next) - OPEN_BEFORE_S) return;
      if (index === slotIndex(r) && nowS() < roundStart(r) + ROUND.reveal) return;
      try {
        await reveal(tee, index);
        const after = await readSlot(tee, index).catch(() => null);
        log(`revealed round ${after?.round.toNumber() ?? "?"} (slot ${index})`);
      } catch {
        // Not revealable yet (or nothing to reveal); try again on the next sweep.
      }
      return;
    }

    if (slot.status !== STATUS.revealed) return;
    const round = slot.round.toNumber();
    const unpaid = slot.calls.slice(0, slot.callCount).filter((c) => c.claimed === 0);
    for (const c of unpaid) {
      await claim(tee, index, c.player).catch((e) => log(`claim ${c.player.toBase58()} failed:`, msg(e)));
    }
    // Log each payout once; old rounds found in a slot (e.g. rescued) are logged once too.
    if (!paidLogged.has(round)) {
      const after = unpaid.length ? await readSlot(tee, index).catch(() => null) : slot;
      if (after && after.claimedCount === after.callCount) {
        paidLogged.add(round);
        log(`paid round ${round}: ${after.callCount} calls, outcome ${after.outcome}`);
      }
    }
  }

  let lastSweep = 0;
  try {
    while (!opts.until?.()) {
      const r = currentRound();
      const next = r + 1;
      const t = nowS();

      // Open the next round, retrying on errors until its open window closes.
      if (
        !opened.has(next) &&
        t >= roundStart(next) - OPEN_BEFORE_S &&
        t < roundStart(next) + OPEN_UNTIL_S
      ) {
        try {
          await openRound(tee, next);
          opened.add(next);
          log(`opened round ${next} (slot ${slotIndex(next)})`);
        } catch (e) {
          log(`open ${next} failed, will retry:`, msg(e));
          await sleep(1_500);
        }
      }

      // Sweep every slot regularly, and right after each reveal time.
      const sinceReveal = t - roundStart(r) - ROUND.reveal;
      const justRevealable = sinceReveal >= 0 && sinceReveal < 8 && !paidLogged.has(r);
      if (Date.now() - lastSweep > SWEEP_EVERY_MS || justRevealable) {
        lastSweep = Date.now();
        for (let i = 0; i < ROUND.slots; i++) await settleSlot(i);
      }

      for (const k of opened) if (k < r - 2) opened.delete(k);
      // Keep the set small without forgetting rounds that may still sit in a slot.
      if (paidLogged.size > 200) {
        const keep = [...paidLogged].sort((x, y) => y - x).slice(0, 100);
        paidLogged.clear();
        keep.forEach((k) => paidLogged.add(k));
      }
      await sleep(500);
    }
  } finally {
    clearInterval(ticker);
  }
}

if (require.main === module) {
  // Crash loudly so the host restarts us, rather than hanging half-alive.
  process.on("unhandledRejection", (e) => {
    console.error("unhandled rejection", e);
    process.exit(1);
  });
  (async () => {
    const tee = await teeProgramFor(loadKeeperKeypair());
    console.log("keeper running as", tee.provider.publicKey!.toBase58());
    await runKeeper(tee);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
