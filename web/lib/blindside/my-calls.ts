/**
 * Your own calls, remembered in this browser. The round account is private
 * until the reveal, so this is how the app shows "your call" mid-round.
 */
export type MyCall = {
  round: number;
  side: number;
  amount: number;
  sig: string;
  at: number;
  wallet: string;
};

const KEY = "blindside:my-calls";
const listeners = new Set<() => void>();
let cache: MyCall[] | null = null;

function read(): MyCall[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as MyCall[];
  } catch {
    cache = [];
  }
  return cache;
}

export function rememberCall(c: MyCall) {
  const next = [c, ...read().filter((x) => !(x.round === c.round && x.wallet === c.wallet))].slice(0, 200);
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept in memory only.
  }
  listeners.forEach((l) => l());
}

export function subscribeCalls(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const getCalls = () => (typeof window === "undefined" ? EMPTY : read());
const EMPTY: MyCall[] = [];
