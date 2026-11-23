"use client";

import { SIDE } from "@blindside/client";
import { BadgeCheck, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LiveChart, type RevealMarks } from "@/components/market/live-chart";
import { getCalls, subscribeCalls, type MyCall } from "@/lib/blindside/my-calls";
import { payoutFor, useRoundResult, type RoundResult } from "@/lib/blindside/results";
import { useSession } from "@/lib/blindside/session";
import { ROUND } from "@/lib/config";
import { cn } from "@/lib/cn";
import { roundStart } from "@blindside/client";
import { scheduleAt } from "@/lib/schedule";
import { useSettings } from "@/lib/settings";
import { useNow } from "@/lib/use-now";
import { HiddenTag, NowTag } from "./round-clock";

/** How long into the next round the reveal stays on the chart. */
const LINGER_S = 12;

/**
 * The market chart, plus the reveal moment: at 80 s the hidden band gives way
 * to the real close, the starting price locks in, the 30 s that decided the
 * round light up, and the outcome lands.
 */
export function MarketChart({ className }: { className?: string }) {
  const now = useNow();
  const sched = now ? scheduleAt(now) : null;
  const revealRound = sched
    ? sched.t >= ROUND.revealAt
      ? sched.round
      : sched.t < LINGER_S
        ? sched.round - 1
        : null
    : null;
  const result = useRoundResult(revealRound);
  const settings = useSettings();

  // Start the draw-in when the result first arrives.
  const [shownAt, setShownAt] = useState<number | null>(null);
  useEffect(() => {
    if (!result) return setShownAt(null);
    setShownAt(Date.now());
    // Browsers only allow vibration after the user has interacted with the page.
    const activated =
      typeof navigator !== "undefined" &&
      (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
        ?.hasBeenActive;
    if (settings.haptics && activated && "vibrate" in navigator) {
      navigator.vibrate?.(result.outcome === "void" ? 15 : [20, 40, 20]);
    }
  }, [result, settings.haptics]);

  const reduced =
    settings.motion === "reduced" ||
    (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const marks = useMemo<RevealMarks | null>(() => {
    if (!result || !shownAt) return null;
    const s = result.slot;
    const closeMs = s.strikeTs.toNumber()
      ? s.strikeTs.toNumber() * 1000
      : (roundStart(result.round) + result.closeS) * 1000;
    return {
      closeMs,
      endMs: s.settleTs.toNumber() ? s.settleTs.toNumber() * 1000 : null,
      strike: result.strike,
      settle: result.settle,
      outcome: result.outcome,
      at: shownAt,
      instant: Boolean(reduced),
    };
  }, [result, shownAt, reduced]);

  const revealing = Boolean(sched && sched.t >= ROUND.revealAt && !result);

  return (
    <LiveChart className={className} windowSeconds={90} closeWindow lineWidth={2} reveal={marks}>
      {marks && result ? (
        <RevealLayer result={result} instant={Boolean(reduced)} />
      ) : (
        <>
          {!revealing && <HiddenTag />}
          <NowTag />
        </>
      )}
      {revealing && (
        <span className="pointer-events-none absolute top-8 left-1/2 flex -translate-x-1/2 items-center gap-6 rounded-4 bg-bg-inverse px-8 py-4 font-mono text-[11px] tracking-[0.08em] text-text-inverse">
          <Loader2 className="size-12 animate-spin" aria-hidden />
          REVEALING
        </span>
      )}
    </LiveChart>
  );
}

const fmtPrice = (n: number | null) => (n === null ? "—" : `$${n.toFixed(4)}`);
const fmtUsdc = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function RevealLayer({ result, instant }: { result: RoundResult; instant: boolean }) {
  const { publicKey } = useSession();
  const all = useSyncExternalStore(subscribeCalls, getCalls, () => [] as MyCall[]);
  const key = publicKey?.toBase58();
  const mine = all.find((c) => c.round === result.round && c.wallet === key);
  const onChain = mine ? result.calls.find((c) => c.player.toBase58() === key) : undefined;

  const delay = (s: number) => (instant ? 0 : s);
  const move =
    result.strike !== null && result.settle !== null ? result.settle - result.strike : null;
  const pct = move !== null && result.strike ? (move / result.strike) * 100 : null;
  const won = result.outcome === "up" ? "up" : result.outcome === "down" ? "down" : null;
  const oneSided = result.outcome === "void" && result.slot.voidReason === 6;

  let personal: { text: string; tone: "up" | "down" | "neutral" } | null = null;
  if (mine) {
    const back = payoutFor(result, mine.side, mine.amount, onChain?.late ?? false);
    const net = back - mine.amount;
    personal =
      onChain?.late
        ? { text: `Refunded ${fmtUsdc(mine.amount)} USDC: your call was after the close`, tone: "neutral" }
        : result.outcome === "void"
        ? { text: `Refunded ${fmtUsdc(mine.amount)} USDC`, tone: "neutral" }
        : net > 0
          ? { text: `You won +${fmtUsdc(net)} USDC`, tone: "up" }
          : { text: `You lost ${fmtUsdc(mine.amount)} USDC`, tone: "down" };
  }

  return (
    <div className="pointer-events-none absolute inset-0" aria-live="polite">
      {/* Close tag */}
      <motion.span
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.1), duration: 0.3 }}
        className="absolute top-8 left-[var(--close-x)] flex -translate-x-1/2 items-center gap-4 whitespace-nowrap rounded-4 bg-bg-brand px-8 py-4 font-mono text-[11px] tracking-[0.08em] text-text-on-color"
      >
        CLOSED AT 0:{String(result.closeS).padStart(2, "0")}
        {result.verified && <BadgeCheck className="size-12" aria-label="verified" />}
      </motion.span>

      {/* Starting price */}
      {result.strike !== null && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay(0.6), duration: 0.3 }}
          className="absolute top-[var(--strike-y)] left-[var(--close-x)] -translate-x-[calc(100%+8px)] -translate-y-1/2 whitespace-nowrap rounded-4 bg-bg-primary/90 px-6 py-2 font-mono text-[11px] text-text-brand shadow-hairline"
        >
          START {fmtPrice(result.strike)}
        </motion.span>
      )}

      {/* Result 30 s later */}
      {result.settle !== null && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay(1.2), duration: 0.3 }}
          className={cn(
            "absolute bottom-8 left-[var(--end-x)] -translate-x-1/2 whitespace-nowrap rounded-4 px-6 py-2 font-mono text-[11px] text-text-on-color",
            won === "up" ? "bg-bg-up" : won === "down" ? "bg-bg-down" : "bg-bg-inverse text-text-inverse",
          )}
        >
          +30s {fmtPrice(result.settle)}
        </motion.span>
      )}

      {/* Outcome */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: delay(1.5), type: "spring", stiffness: 320, damping: 24 }}
        className="absolute top-[34%] left-1/2 w-max max-w-[86%] -translate-x-1/2 rounded-12 bg-bg-primary/90 px-18 py-12 text-center shadow-dropdown backdrop-blur-md"
      >
        <p
          className={cn(
            "font-mono text-[20px] leading-[26px] font-medium tracking-[0.02em] md:text-[24px] md:leading-[30px]",
            won === "up" ? "text-text-up" : won === "down" ? "text-text-down" : "text-text-primary",
          )}
        >
          {won === "up" ? "▲ HIGHER WINS" : won === "down" ? "▼ LOWER WINS" : "REFUNDED"}
        </p>
        <p className="mt-2 font-mono text-[12px] text-text-secondary">
          {move !== null && pct !== null
            ? `${fmtPrice(result.strike)} → ${fmtPrice(result.settle)} · ${move >= 0 ? "+" : ""}${pct.toFixed(3)}%`
            : oneSided
              ? "Nobody took the other side"
              : result.voidReason || "No result price"}
        </p>
        {personal && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay(1.9), duration: 0.3 }}
            className={cn(
              "mt-8 text-[15px] font-[652]",
              personal.tone === "up" && "text-text-up",
              personal.tone === "down" && "text-text-down",
            )}
          >
            {personal.text}
            <span className="ml-6 font-mono text-[11px] font-normal text-text-tertiary">
              {mine?.side === SIDE.up ? "you called Higher" : "you called Lower"}
            </span>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
