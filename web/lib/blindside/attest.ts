"use client";

import { verifyTeeAttestation } from "@blindside/client";
import { useEffect, useState } from "react";

export type AttestState =
  | { status: "checking" }
  | { status: "ok"; ms: number }
  | { status: "failed"; error: string };

/*
 * One TEE attestation check per visit, shared by every component that shows
 * it (market bar, proof panel). `recheck()` starts a fresh one.
 */
let current: Promise<AttestState> | null = null;
const listeners = new Set<(s: AttestState) => void>();

function run(): Promise<AttestState> {
  const t0 = performance.now();
  current = verifyTeeAttestation()
    .then((): AttestState => ({ status: "ok", ms: Math.round(performance.now() - t0) }))
    .catch((e: Error): AttestState => ({ status: "failed", error: e.message || "No answer" }));
  current.then((s) => listeners.forEach((l) => l(s)));
  return current;
}

export function recheckAttestation() {
  listeners.forEach((l) => l({ status: "checking" }));
  void run();
}

export function useTeeAttestation(): AttestState {
  const [state, setState] = useState<AttestState>({ status: "checking" });
  useEffect(() => {
    listeners.add(setState);
    void (current ?? run()).then(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}
