import { ROUND } from "./config";

/**
 * The fixed 90-second round clock. Rounds start on wall-clock multiples of 90 s
 * (UTC), so every client — and the program — agrees on where a round is
 * without talking to anyone. The hidden close falls somewhere in
 * [start + 10 s, start + 50 s]; nobody knows where until the reveal.
 */
export type ScheduleState = {
  round: number;
  roundStart: number;
  /** Seconds since the round opened. */
  t: number;
  phase: "sure" | "maybe" | "developing" | "reveal";
  /** The hidden-close window being shown (ms since epoch). */
  windowFrom: number;
  windowTo: number;
  /** What the countdown is counting to. */
  countdownTo: number;
  countdownLabel: string;
};

const CYCLE_MS = ROUND.cycle * 1000;

export function scheduleAt(now: number): ScheduleState {
  const round = Math.floor(now / CYCLE_MS);
  const roundStart = round * CYCLE_MS;
  const t = (now - roundStart) / 1000;
  const window = (start: number) => ({
    windowFrom: start + ROUND.sureUntil * 1000,
    windowTo: start + ROUND.closeLatest * 1000,
  });

  if (t < ROUND.sureUntil) {
    return {
      round,
      roundStart,
      t,
      phase: "sure",
      ...window(roundStart),
      countdownTo: roundStart + ROUND.sureUntil * 1000,
      countdownLabel: "Calls count for sure for",
    };
  }
  if (t < ROUND.closeLatest) {
    return {
      round,
      roundStart,
      t,
      phase: "maybe",
      ...window(roundStart),
      countdownTo: roundStart + ROUND.closeLatest * 1000,
      countdownLabel: "Calls close in",
    };
  }
  if (t < ROUND.revealAt) {
    return {
      round,
      roundStart,
      t,
      phase: "developing",
      ...window(roundStart),
      countdownTo: roundStart + ROUND.revealAt * 1000,
      countdownLabel: "Reveal in",
    };
  }
  const next = roundStart + CYCLE_MS;
  return {
    round,
    roundStart,
    t,
    phase: "reveal",
    ...window(next),
    countdownTo: next,
    countdownLabel: "Next round in",
  };
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
