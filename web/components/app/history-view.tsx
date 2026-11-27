"use client";

import { SIDE, roundStart, ROUND } from "@blindside/client";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Check,
  ChevronRight,
  Copy,
  History as HistoryIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { SectionTitle } from "@/components/app/app-shell";
import { WalletGate } from "@/components/app/wallet-gate";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Surface } from "@/components/ui/surface";
import { getArchiveList, getNoArchive, getArchived, subscribeArchive } from "@/lib/blindside/archive";
import { getCalls, getNoCalls, subscribeCalls, type MyCall } from "@/lib/blindside/my-calls";
import { fetchRecentRounds, payoutFor, verifyClose, type RoundResult } from "@/lib/blindside/results";
import { cn } from "@/lib/cn";
import { useNow } from "@/lib/use-now";

const usdc = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const price = (n: number | null) => (n === null ? "—" : `$${n.toFixed(4)}`);
const close = (s: number) => `0:${String(s).padStart(2, "0")}`;
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/** `now` comes from useNow(), which is 0 until the page is in the browser. */
function ago(round: number, now: number) {
  if (!now) return "";
  const s = Math.max(0, Math.floor(now / 1000) - roundStart(round));
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(roundStart(round) * 1000).toLocaleDateString();
}

export type Status = "won" | "lost" | "refunded" | "pending" | "missing";
export function statusOf(c: MyCall, r: RoundResult | null, now: number): { status: Status; net: number } {
  if (!r) {
    const revealAt = roundStart(c.round) + ROUND.reveal;
    const gone = now / 1000 > revealAt + (ROUND.slots - 1) * ROUND.cycle;
    return { status: gone ? "missing" : "pending", net: 0 };
  }
  const late = r.calls.find((x) => x.player === c.wallet)?.late ?? false;
  const back = payoutFor(r, c.side, c.amount, late);
  if (r.outcome === "void" || late) return { status: "refunded", net: 0 };
  return back > c.amount ? { status: "won", net: back - c.amount } : { status: "lost", net: -c.amount };
}

const FILTERS = ["All", "Won", "Lost", "Refunded"] as const;

export function HistoryView() {
  const [verify, setVerify] = useState<RoundResult | null>(null);
  return (
    <>
      <WalletGate
        title="Connect to see your calls"
        body="Your calls are remembered in this browser for the wallet you connect."
      >
        {(address) => <MyCalls address={address} onVerify={setVerify} />}
      </WalletGate>
      <RecentRounds onVerify={setVerify} />
      <VerifyModal result={verify} onClose={() => setVerify(null)} />
    </>
  );
}

function MyCalls({ address, onVerify }: { address: string; onVerify: (r: RoundResult) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const now = useNow();
  const calls = useSyncExternalStore(subscribeCalls, getCalls, getNoCalls);
  useSyncExternalStore(subscribeArchive, getArchiveList, getNoArchive);
  const mine = useMemo(() => calls.filter((c) => c.wallet === address), [calls, address]);
  const rows = mine.map((c) => {
    const r = getArchived(c.round);
    return { c, r, ...statusOf(c, r, now) };
  });
  const shown = rows.filter((x) => filter === "All" || x.status === filter.toLowerCase());
  const settled = rows.filter((x) => x.status === "won" || x.status === "lost");
  const net = settled.reduce((n, x) => n + x.net, 0);

  if (mine.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon className="size-20" />}
        title="No calls yet"
        body="Calls you make show up here, with the result and the proof once each round is revealed."
        action={
          <ButtonLink href="/play" size="sm">
            Make a call
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-14 flex flex-wrap items-center justify-between gap-12">
        <div role="tablist" aria-label="Filter calls" className="flex flex-wrap gap-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "h-32 rounded-8 px-12 font-mono text-[12px] transition-colors",
                filter === f
                  ? "bg-bg-inverse text-text-inverse"
                  : "bg-bg-soft text-text-secondary hover:text-text-primary",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="font-mono text-[12px] text-text-secondary">
          {mine.length} {mine.length === 1 ? "call" : "calls"} ·{" "}
          {settled.filter((x) => x.status === "won").length} won ·{" "}
          <span className={net > 0 ? "text-text-up" : net < 0 ? "text-text-down" : ""}>
            {net >= 0 ? "+" : ""}
            {usdc(net)} USDC
          </span>
        </p>
      </div>

      <Surface>
        <div className="hidden grid-cols-[1.1fr_1fr_1.1fr_0.7fr_1.4fr_auto] gap-12 border-b border-dashed border-border-secondary-hover px-20 py-10 text-label text-text-tertiary md:grid">
          <span>Round</span>
          <span>Your call</span>
          <span>Result</span>
          <span>Close</span>
          <span>Start → 30 s later</span>
          <span className="w-64" />
        </div>
        <ul>
          {shown.map(({ c, r, status, net: n }) => (
            <li
              key={c.round}
              className="grid grid-cols-2 gap-x-12 gap-y-6 border-border-secondary px-16 py-12 not-last:border-b md:grid-cols-[1.1fr_1fr_1.1fr_0.7fr_1.4fr_auto] md:items-center md:px-20"
            >
              <span className="font-mono text-[13px]">
                #{c.round.toLocaleString("en-US")}
                <span className="block text-[11px] text-text-tertiary">{ago(c.round, now)}</span>
              </span>
              <span className="flex items-center gap-6 text-[14px]">
                {c.side === SIDE.up ? (
                  <ArrowUp className="size-14 text-text-up" aria-hidden />
                ) : (
                  <ArrowDown className="size-14 text-text-down" aria-hidden />
                )}
                {c.side === SIDE.up ? "Higher" : "Lower"} · {c.amount}
              </span>
              <span
                className={cn(
                  "text-[14px] font-[600]",
                  status === "won" && "text-text-up",
                  status === "lost" && "text-text-down",
                  (status === "pending" || status === "missing") && "font-normal text-text-tertiary",
                )}
              >
                {status === "won"
                  ? `Won +${usdc(n)}`
                  : status === "lost"
                    ? `Lost ${usdc(-n)}`
                    : status === "refunded"
                      ? "Refunded"
                      : status === "pending"
                        ? "Waiting for the reveal"
                        : "Not captured"}
              </span>
              <span className="flex items-center gap-4 font-mono text-[13px]">
                {r ? close(r.closeS) : "—"}
                {r?.verified && <BadgeCheck className="size-13 text-text-up" aria-label="verified" />}
              </span>
              <span className="font-mono text-[12px] text-text-secondary">
                {r ? `${price(r.strike)} → ${price(r.settle)}` : "—"}
              </span>
              <span className="md:w-64 md:text-right">
                {r && (
                  <button
                    onClick={() => onVerify(r)}
                    className="text-[12px] font-[600] text-text-brand underline-offset-4 hover:underline"
                  >
                    Verify
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
      <p className="mt-10 text-[12px] text-text-tertiary">
        Results are saved in this browser the moment they&apos;re revealed. &quot;Not captured&quot; means
        the app wasn&apos;t open within ~12 minutes of that round, before its slot was reused.
      </p>
    </div>
  );
}

function RecentRounds({ onVerify }: { onVerify: (r: RoundResult) => void }) {
  const [rounds, setRounds] = useState<RoundResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      setRounds(await fetchRecentRounds());
    } catch {
      setRounds((r) => r ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);
  const now = useNow();
  const live = now ? Math.floor(now / 90_000) : 0;

  return (
    <div className="mt-48">
      <div className="flex items-end justify-between gap-12">
        <SectionTitle
          index="Public"
          description="Every revealed round still on chain (the last ~12 minutes), read straight from MagicBlock's private rollup. No wallet needed."
        >
          Recent rounds
        </SectionTitle>
        <Button
          size="sm"
          variant="secondary"
          className="mb-14"
          onClick={() => void load()}
          disabled={loading}
          icon={loading ? <Loader2 className="size-14 animate-spin" /> : <RefreshCw className="size-14" />}
        >
          Refresh
        </Button>
      </div>
      <Surface>
        {rounds === null ? (
          <p className="flex items-center gap-8 px-20 py-16 text-[13px] text-text-tertiary">
            <Loader2 className="size-14 animate-spin" aria-hidden /> Reading the rollup…
          </p>
        ) : rounds.length === 0 ? (
          <p className="px-20 py-16 text-[13px] text-text-tertiary">No revealed rounds right now.</p>
        ) : (
          <ul>
            {rounds.map((r) => (
              <li
                key={r.round}
                className="grid grid-cols-2 gap-x-12 gap-y-6 border-border-secondary px-16 py-12 not-last:border-b md:grid-cols-[1.1fr_1fr_0.7fr_1.4fr_1fr_auto] md:items-center md:px-20"
              >
                <span className="font-mono text-[13px]">
                  #{r.round.toLocaleString("en-US")}
                  <span className="block text-[11px] text-text-tertiary">
                    {live && live - r.round <= 1 ? "just now" : ago(r.round, now)}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-mono text-[12px]",
                    r.outcome === "up" ? "text-text-up" : r.outcome === "down" ? "text-text-down" : "text-text-tertiary",
                  )}
                >
                  {r.outcome === "up"
                    ? "▲ Higher won"
                    : r.outcome === "down"
                      ? "▼ Lower won"
                      : r.calls.length === 0
                        ? "No calls"
                        : "Refunded"}
                </span>
                <span className="flex items-center gap-4 font-mono text-[13px]">
                  {close(r.closeS)}
                  {r.verified && <BadgeCheck className="size-13 text-text-up" aria-label="verified" />}
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {price(r.strike)} → {price(r.settle)}
                </span>
                <span className="font-mono text-[12px] text-text-secondary">
                  {r.calls.length} {r.calls.length === 1 ? "call" : "calls"} · {usdc(r.upPool)}/{usdc(r.downPool)}
                </span>
                <span className="md:w-64 md:text-right">
                  <button
                    onClick={() => onVerify(r)}
                    className="text-[12px] font-[600] text-text-brand underline-offset-4 hover:underline"
                  >
                    Verify
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

/** A long hex value, shortened, with a copy button. The full value is in the tooltip. */
function Hash({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {}
      }}
      className="tile inline-flex h-26 shrink-0 items-center gap-6 rounded-8 px-8 font-mono text-[11.5px] text-text-secondary transition-colors hover:text-text-primary"
    >
      {value.slice(0, 6)}…{value.slice(-4)}
      {copied ? <Check className="size-12 text-text-up" aria-hidden /> : <Copy className="size-12" aria-hidden />}
      <span className="sr-only">{copied ? "Copied" : "Copy full value"}</span>
    </button>
  );
}

function Ingredient({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-12 py-12 first:pt-0 last:pb-0">
      <span className="tile flex size-24 shrink-0 items-center justify-center rounded-full font-mono text-[11px] text-text-secondary">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
          <p className="text-[14px] font-[600] tracking-[-0.01em]">{title}</p>
          {children}
        </div>
        <p className="mt-2 text-[13px] leading-[1.5] text-text-secondary">{body}</p>
      </div>
    </li>
  );
}

function VerifyModal({ result, onClose }: { result: RoundResult | null; onClose: () => void }) {
  const recomputed = useMemo(() => (result ? verifyClose(result) : null), [result]);
  if (!result) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const ok = recomputed === result.closeS;
  const mixed = result.calls.slice(0, result.seedCalls);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Verify round #${result.round.toLocaleString("en-US")}`}
      description="Was the close really random? Your browser just worked it out again."
    >
      {/* The answer first. */}
      <div className={cn("rounded-20 px-18 py-16", ok ? "bg-bg-up-soft" : "bg-bg-down-soft")}>
        <p className={cn("flex items-center gap-6 text-[13px] font-[600]", ok ? "text-text-up" : "text-text-down")}>
          <BadgeCheck className="size-16" aria-hidden />
          {ok ? "Verified" : "Doesn't match"}
        </p>
        <p className="mt-6 text-[15px] leading-[1.45] text-text-primary">
          {ok ? (
            <>
              Betting closed at <span className="font-[700]">{close(result.closeS)}</span>, and your browser got
              the same answer from the public data.
            </>
          ) : (
            <>
              The round says {close(result.closeS)}, but your browser got{" "}
              <span className="font-[700]">{close(recomputed ?? 0)}</span>.
            </>
          )}
        </p>
      </div>

      {/* What went in. */}
      <p className="mt-20 text-label text-text-tertiary">The close was mixed from</p>
      <ol className="mt-12 flex flex-col divide-y divide-line">
        <Ingredient n={1} title="Our secret" body="Sealed in the private rollup when the round opened.">
          <Hash value={result.secret} />
        </Ingredient>
        <Ingredient
          n={2}
          title="Players' random numbers"
          body={
            mixed.length
              ? "Each call in the first 10 s added a random number from the player's device."
              : "Nobody called in the first 10 s this round, so nothing was added here."
          }
        >
          {mixed.length === 0 ? (
            <span className="text-[12.5px] text-text-tertiary">None</span>
          ) : (
            <span className="text-[12.5px] text-text-tertiary">
              {mixed.length} call{mixed.length === 1 ? "" : "s"}
            </span>
          )}
        </Ingredient>
        <Ingredient
          n={3}
          title="MagicBlock VRF"
          body={
            result.vrf
              ? "Verifiable randomness from MagicBlock, requested inside the rollup."
              : "It didn't arrive in the first 10 s, so the other two decided the close."
          }
        >
          {result.vrf ? <Hash value={result.vrf} /> : <span className="text-[12.5px] text-text-tertiary">Not used</span>}
        </Ingredient>
      </ol>

      <p className="mt-16 rounded-14 bg-bg-soft px-14 py-12 text-[13px] leading-[1.5] text-text-secondary">
        All of it stayed hidden until the reveal, and no one held every piece, so nobody could know the close in
        advance. Not even us.
      </p>

      <details className="group mt-14 text-[13px]">
        <summary className="flex cursor-pointer list-none items-center gap-6 font-[600] text-text-secondary hover:text-text-primary [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-14 transition-transform group-open:rotate-90" aria-hidden />
          Show the math
        </summary>
        <div className="mt-10 font-mono text-[11.5px] leading-[1.8] text-text-secondary">
          <p>e = sha256(&quot;blindside&quot; ‖ secret)</p>
          <p>for each early call: e = sha256(e ‖ player ‖ nonce)</p>
          <p>if VRF arrived: e = sha256(e ‖ &quot;vrf&quot; ‖ vrf)</p>
          <p>close = 10 + (first 8 bytes of e) mod 41</p>
          {mixed.length > 0 && (
            <div className="mt-8 border-t border-line pt-8">
              {mixed.map((c) => (
                <p key={c.player}>
                  {short(c.player)} · nonce {c.nonce.slice(0, 12)}…
                </p>
              ))}
            </div>
          )}
        </div>
      </details>
    </Modal>
  );
}
