"use client";

import { useSyncExternalStore } from "react";

export type Settings = {
  sound: boolean;
  haptics: boolean;
  motion: "system" | "reduced";
  sessionMinutes: number | null;
  sessionLossUsdc: number | null;
  defaultFreeCalls: boolean;
};

const KEY = "blindside:settings";
const DEFAULTS: Settings = {
  sound: false,
  haptics: true,
  motion: "system",
  sessionMinutes: null,
  sessionLossUsdc: null,
  defaultFreeCalls: false,
};

const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage can be unavailable (private mode); settings still apply for this visit.
  }
  listeners.forEach((l) => l());
}

export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS,
  );
}
