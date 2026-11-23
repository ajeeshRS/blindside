import { ROUND } from "./constants";

export const nowS = () => Math.floor(Date.now() / 1000);
export const currentRound = (t = nowS()) => Math.floor(t / ROUND.cycle);
export const roundStart = (round: number) => round * ROUND.cycle;
export const slotIndex = (round: number) => round % ROUND.slots;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function sleepUntil(unixS: number) {
  const ms = unixS * 1000 - Date.now();
  if (ms > 0) await sleep(ms);
}
