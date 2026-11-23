"use client";

import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "blindside:theme";

/**
 * Runs in <head> before first paint (see app/layout.tsx), so the page never
 * flashes the wrong theme. Keep it tiny and dependency-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme",d?"dark":"light");r.setAttribute("data-theme-pref",p)}catch(e){}})()`;

const listeners = new Set<() => void>();
let mediaBound = false;

function root() {
  return document.documentElement;
}

function readPreference(): ThemePreference {
  const p = root().getAttribute("data-theme-pref");
  return p === "light" || p === "dark" ? p : "system";
}

function readResolved(): ResolvedTheme {
  return root().getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function systemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && systemIsDark());
  root().setAttribute("data-theme", dark ? "dark" : "light");
  root().setAttribute("data-theme-pref", pref);
  listeners.forEach((l) => l());
}

export function setThemePreference(pref: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage unavailable (private mode); the theme still applies for this visit.
  }
  apply(pref);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!mediaBound) {
    mediaBound = true;
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (readPreference() === "system") apply("system");
      });
  }
  return () => listeners.delete(listener);
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const resolved = useSyncExternalStore(subscribe, readResolved, () => "light" as const);
  return { preference, resolved, setPreference: setThemePreference };
}
