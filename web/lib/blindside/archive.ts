import type { RoundResult } from "./results";

/**
 * Revealed rounds, kept in this browser. Round slots are reused every ~12
 * minutes on chain, so the app saves each result the moment it sees it. Every
 * entry carries the secret and nonces, so it can still be verified later.
 */
const KEY = "blindside:rounds";
const MAX = 500;
const listeners = new Set<() => void>();
let cache: Record<number, RoundResult> | null = null;
let list: RoundResult[] = [];

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<number, RoundResult>;
  } catch {
    cache = {};
  }
  list = Object.values(cache).sort((a, b) => b.round - a.round);
  return cache;
}

export function getArchived(round: number): RoundResult | null {
  if (typeof window === "undefined") return null;
  return load()[round] ?? null;
}

export function saveRound(r: RoundResult) {
  if (typeof window === "undefined") return;
  const all = load();
  if (all[r.round]) return;
  all[r.round] = r;
  list = Object.values(all)
    .sort((a, b) => b.round - a.round)
    .slice(0, MAX);
  cache = Object.fromEntries(list.map((x) => [x.round, x]));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Kept in memory only.
  }
  listeners.forEach((l) => l());
}

export function subscribeArchive(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: RoundResult[] = [];
/** Stable empty list for useSyncExternalStore's server snapshot. */
export const getNoArchive = () => EMPTY;
export const getArchiveList = () => (typeof window === "undefined" ? EMPTY : (load(), list));
