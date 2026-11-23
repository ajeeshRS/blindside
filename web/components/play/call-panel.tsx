"use client";

import { SIDE } from "@blindside/client";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowDown, ArrowUp, Check, Loader2, Zap } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ConnectButton } from "@/components/wallet/connect-button";
import { getCalls, subscribeCalls, type MyCall } from "@/lib/blindside/my-calls";
import { useSession } from "@/lib/blindside/session";
import { TestWalletName } from "@/lib/blindside/test-wallet";
import { ROUND, STAKES_USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { roundAvailability } from "@/lib/round";
import { formatCountdown, scheduleAt } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { RoundResultCard } from "./round-result";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function errorText(e: unknown) {
  const m = (e as Error)?.message ?? String(e);
  if (/reject|denied|cancel/i.test(m)) return "Cancelled in the wallet.";
  return m.length > 140 ? `${m.slice(0, 140)}…` : m;
}

export function CallPanel() {
  const s = useSession();
  const { select } = useWallet();
  const now = useNow();
  const sched = now ? scheduleAt(now) : null;
  const [stake, setStake] = useState<number>(STAKES_USDC[1]);
  const availability = roundAvailability();
  const myKey = s.publicKey?.toBase58() ?? "";

  const all = useSyncExternalStore(subscribeCalls, getCalls, () => [] as MyCall[]);
  const mine = useMemo(() => all.filter((c) => c.wallet === myKey), [all, myKey]);
  const thisRound = sched ? mine.find((c) => c.round === sched.round) : undefined;
  const last = mine[0];

  const callsOpen = Boolean(sched && sched.t < ROUND.closeLatest);
  const balance = s.player.kind === "playing" ? s.player.balance : null;

  async function act(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      if ((e as Error).message !== "Busy") toast.error(errorText(e));
    }
  }

  const header = (
    <Panel
      label="Your call"
      meta={
        balance !== null ? (
          <span className="font-mono text-[13px] tabular">{fmt(balance)} USDC</span>
        ) : undefined
      }
    >
      <div className="p-16 md:p-20">{body()}</div>
    </Panel>
  );

  function body() {
    if (!availability.available) {
      return <p className="text-[14px] text-text-secondary">{availability.reason}</p>;
    }

    // 1. No wallet.
    if (!s.publicKey) {
      return (
        <>
          <p className="text-[18px] leading-[24px] font-[652] tracking-[-0.2px]">
            Higher or lower in 30 seconds?
          </p>
          <p className="mt-6 text-[14px] leading-[20px] text-text-secondary">
            Play with free test USDC on Solana devnet.
          </p>
          <Button
            className="mt-16 h-48 w-full rounded-12 text-[15px]"
            icon={<Zap className="size-16" />}
            onClick={() => select(TestWalletName)}
          >
            Play instantly
          </Button>
          <div className="mt-8">
            <ConnectButton variant="secondary" className="h-40 w-full" />
          </div>
          <p className="mt-10 text-[12px] leading-[17px] text-text-tertiary">
            &quot;Play instantly&quot; makes a devnet test wallet in this browser. No install, no
            pop-ups.
          </p>
        </>
      );
    }

    // 2. Setting up (or needs to).
    if (s.player.kind === "loading") {
      return <Working label="Checking your account" />;
    }
    if (s.busy === "Setting up" || s.player.kind === "none" || s.player.kind === "base") {
      const resuming = s.player.kind === "base";
      return (
        <>
          <p className="text-[18px] leading-[24px] font-[652] tracking-[-0.2px]">
            {resuming ? "Back in the game?" : "Get 100 test USDC and start"}
          </p>
          <p className="mt-6 text-[14px] leading-[20px] text-text-secondary">
            {resuming
              ? "Move your balance back into the private rollup to keep playing."
              : "We'll fund this wallet with devnet SOL and test USDC, and move your balance into MagicBlock's private rollup. One approval."}
          </p>
          {s.steps.length > 0 && (
            <ol className="mt-14 flex flex-col gap-6">
              {s.steps.map((st) => (
                <li key={st.label} className="flex items-center gap-8 text-[13px]">
                  {st.done ? (
                    <Check className="size-14 text-text-up" aria-hidden />
                  ) : (
                    <Loader2 className="size-14 animate-spin text-text-tertiary" aria-hidden />
                  )}
                  <span className={st.done ? "text-text-primary" : "text-text-tertiary"}>
                    {st.label}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Button
            className="mt-16 h-48 w-full rounded-12 text-[15px]"
            disabled={Boolean(s.busy)}
            onClick={() => act(s.start, "You're in. Make your first call.")}
          >
            {s.busy === "Setting up" ? "Setting up…" : resuming ? "Resume playing" : "Start playing"}
          </Button>
        </>
      );
    }

    // 3. Delegated but not signed in to the rollup.
    if (!s.signedIn) {
      return (
        <>
          <p className="text-[18px] leading-[24px] font-[652] tracking-[-0.2px]">Sign in to play</p>
          <p className="mt-6 text-[14px] leading-[20px] text-text-secondary">
            One signature lets this browser read your private balance and send calls.
          </p>
          <Button
            className="mt-16 h-48 w-full rounded-12 text-[15px]"
            disabled={Boolean(s.busy)}
            onClick={() => act(s.signIn)}
          >
            {s.busy ? "Signing in…" : "Sign in"}
          </Button>
        </>
      );
    }

    // 4. Ready.
    const canAfford = balance === null || balance >= stake;
    const disabled = !callsOpen || Boolean(thisRound) || Boolean(s.busy) || !canAfford || !sched;
    const send = (side: number) =>
      sched && act(() => s.call(sched.round, side, stake), "Call sent. It stays hidden until the reveal.");

    return (
      <>
        <p className="text-[18px] leading-[24px] font-[652] tracking-[-0.2px]">
          Higher or lower in 30 seconds?
        </p>

        <fieldset className="mt-16" disabled={Boolean(thisRound)}>
          <legend className="mb-8 text-label text-text-tertiary">Stake (USDC)</legend>
          <div className="grid grid-cols-4 gap-6">
            {STAKES_USDC.map((v) => (
              <button
                key={v}
                onClick={() => setStake(v)}
                aria-pressed={stake === v}
                className={cn(
                  "h-40 rounded-8 font-mono text-[15px] tabular transition-colors disabled:opacity-40",
                  stake === v
                    ? "bg-bg-brand text-text-on-color"
                    : "text-text-primary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] hover:bg-bg-secondary",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>

        {thisRound ? (
          <div className="mt-12 rounded-10 border border-dashed border-border-secondary-hover p-12">
            <p className="text-label text-text-tertiary">Your call this round</p>
            <p className="mt-4 flex items-center gap-6 text-[16px] font-[600]">
              {thisRound.side === SIDE.up ? (
                <ArrowUp className="size-16 text-text-up" aria-hidden />
              ) : (
                <ArrowDown className="size-16 text-text-down" aria-hidden />
              )}
              {thisRound.side === SIDE.up ? "Higher" : "Lower"} · {thisRound.amount} USDC
            </p>
            <p className="mt-4 text-[12px] text-text-tertiary">
              {sched && sched.t >= ROUND.revealAt
                ? "Revealed. See the chart."
                : `Hidden until the reveal${
                    sched ? ` in ${formatCountdown(sched.roundStart + ROUND.revealAt * 1000 - now)}` : ""
                  }.`}
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-8">
            <Button
              variant="up"
              className="h-56 rounded-12 text-[16px] font-[600]"
              disabled={disabled}
              onClick={() => send(SIDE.up)}
              icon={<ArrowUp className="size-20" strokeWidth={2.6} />}
            >
              Higher
            </Button>
            <Button
              variant="down"
              className="h-56 rounded-12 text-[16px] font-[600]"
              disabled={disabled}
              onClick={() => send(SIDE.down)}
              icon={<ArrowDown className="size-20" strokeWidth={2.6} />}
            >
              Lower
            </Button>
          </div>
        )}

        <p className="mt-12 text-[13px] leading-[19px] text-text-tertiary">
          {s.busy === "Sending your call"
            ? "Sending…"
            : !callsOpen && sched
              ? `Calls open again in ${formatCountdown(sched.roundStart + ROUND.cycle * 1000 - now)}.`
              : !canAfford
                ? "Not enough balance for this stake."
                : "Calls are final. A call that lands after the secret close is refunded."}
        </p>

        <button
          className="mt-10 text-[12px] text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline disabled:opacity-40"
          disabled={Boolean(s.busy) || (s.player.kind === "playing" && s.player.pending > 0)}
          onClick={() => act(s.cashOut, "Cashed out to your wallet.")}
          title={
            s.player.kind === "playing" && s.player.pending > 0
              ? "Wait for your open call to be paid out"
              : undefined
          }
        >
          {s.busy === "Cashing out" ? "Cashing out…" : "Cash out to wallet"}
        </button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {header}
      {last && <RoundResultCard call={last} />}
    </div>
  );
}

function Working({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-8 text-[14px] text-text-secondary">
      <Loader2 className="size-16 animate-spin" aria-hidden /> {label}…
    </p>
  );
}
