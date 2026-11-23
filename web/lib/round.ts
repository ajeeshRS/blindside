import { ROUND, ROUNDS_PAUSED } from "./config";

export type RoundAvailability =
  | { available: true }
  | { available: false; reason: string };

/**
 * Rounds come only from the Blindside program on devnet (run by the keeper).
 * They can be paused with NEXT_PUBLIC_ROUNDS_PAUSED; the app never invents one.
 */
export function roundAvailability(): RoundAvailability {
  if (ROUNDS_PAUSED) {
    return { available: false, reason: "Rounds are paused for maintenance." };
  }
  return { available: true };
}

export const PHASES = [
  {
    key: "sure",
    from: 0,
    to: ROUND.sureUntil,
    title: "Your call counts",
    body: "Calls made now always count.",
  },
  {
    key: "maybe",
    from: ROUND.sureUntil,
    to: ROUND.closeLatest,
    title: "Hidden close",
    body: "The close happens at a secret moment in this window. Calls after it are refunded.",
  },
  {
    key: "developing",
    from: ROUND.closeLatest,
    to: ROUND.revealAt,
    title: "Developing",
    body: "Calls are closed. The price keeps moving; the starting line stays hidden.",
  },
  {
    key: "reveal",
    from: ROUND.revealAt,
    to: ROUND.resultUntil,
    title: "Reveal",
    body: "The close, the starting price and the result appear, with proof.",
  },
] as const;
