"use client";

import { slotIndex, slotPda, STATUS, type SlotAccount } from "@blindside/client";
import { Eye, Loader2, Lock, LockOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getReader, toResult, type RoundResult } from "@/lib/blindside/results";
import { scheduleAt } from "@/lib/schedule";

/*
 * "Try to peek": make the exact request a bot would make for a round, from
 * this browser, against MagicBlock's private rollup, and show the real answer.
 * A running round's account has a permission with no readers, so the rollup
 * answers as if it didn't exist (`value: null`). A revealed round is public.
 * Nothing here is mocked: both answers come straight from the RPC.
 */

type Peek = {
  round: number;
  address: string;
  /** Seconds into its round when the request was made (current round only). */
  at: number | null;
  ms: number;
  sealed: boolean;
  result: RoundResult | null;
};

async function peekAt(round: number, at: number | null): Promise<Peek> {
  const reader = await getReader();
  const address = slotPda(slotIndex(round));
  const t0 = performance.now();
  const info = await reader.provider.connection.getAccountInfo(address);
  const ms = Math.round(performance.now() - t0);
  let result: RoundResult | null = null;
  if (info) {
    const slot = reader.coder.accounts.decode("slot", info.data) as SlotAccount;
    // The slot is reused every 8 rounds: only count it if it's this round, revealed.
    if (slot.round.toNumber() === round && slot.status === STATUS.revealed) result = toResult(slot);
  }
  return { round, address: address.toBase58(), at, ms, sealed: !result, result };
}

const short = (s: string, n = 6) => `${s.slice(0, n)}…${s.slice(-4)}`;
const mmss = (s: number) => `0:${String(s).padStart(2, "0")}`;

export function PeekPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peeks, setPeeks] = useState<{ now: Peek; before: Peek } | null>(null);

  // Arriving from the landing page's "Try it on a live round" link: bring the
  // panel into view once the chart above it has laid out.
  useEffect(() => {
    if (window.location.hash !== "#peek") return;
    const id = setTimeout(() => document.getElementById("peek")?.scrollIntoView({ behavior: "smooth", block: "start" }), 1200);
    return () => clearTimeout(id);
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const s = scheduleAt(Date.now());
      // The running round, and the same request for the one before it, as proof
      // the request works: that round is revealed, so it comes back in full.
      const [now, before] = await Promise.all([peekAt(s.round, s.t), peekAt(s.round - 1, null)]);
      setPeeks({ now, before });
    } catch (e) {
      setError((e as Error).message || "The private rollup didn't answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="peek" className="frame scroll-mt-88 p-20 md:p-24" aria-labelledby="peek-title">
      <div className="flex flex-wrap items-start justify-between gap-16">
        <div className="max-w-[520px]">
          <h2 id="peek-title" className="text-[20px] leading-[1.2] font-[700] tracking-[-0.035em]">
            Try to peek at the close
          </h2>
          <p className="mt-6 text-[15px] leading-[1.55] text-text-secondary">
            Your browser asks MagicBlock&apos;s private rollup for this round&apos;s data, the same
            request a bot would make, and shows the real answer.
          </p>
        </div>
        <Button
          onClick={run}
          disabled={busy}
          icon={busy ? <Loader2 className="size-16 animate-spin" /> : <Eye className="size-16" />}
        >
          {peeks ? "Peek again" : "Try to peek"}
        </Button>
      </div>

      {error && <p className="mt-16 text-[14px] text-text-down">{error}</p>}

      {peeks && (
        <div className="mt-20 flex flex-col gap-10" aria-live="polite">
          <MainCard peek={peeks.now} />
          {/* Once the running round is revealed itself, the comparison adds nothing. */}
          {peeks.now.sealed && <Compare peek={peeks.before} />}
        </div>
      )}
    </section>
  );
}

function Request({ peek: p }: { peek: Peek }) {
  return (
    <div className="overflow-x-auto rounded-10 bg-bg-soft px-12 py-10 font-code text-[12px] leading-[1.6] whitespace-nowrap text-text-secondary">
      <div>
        <span className="text-text-tertiary">getAccountInfo(</span>
        {short(p.address, 8)}
        <span className="text-text-tertiary">)</span>
      </div>
      <div>
        <span className="text-text-tertiary">→ </span>
        <span className="text-text-primary">
          {p.sealed ? "{ value: null }" : "{ value: { data: 4,008 bytes } }"}
        </span>
      </div>
    </div>
  );
}

function MainCard({ peek: p }: { peek: Peek }) {
  const r = p.result;
  const at = Math.floor(p.at ?? 0);
  const opensIn = Math.max(0, 80 - at);
  return (
    <div className="tile p-16 md:p-20">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <p className="text-label">
          This round · {p.round.toLocaleString("en-US")}
          <span className="font-[500] text-text-tertiary">{` · asked ${at} s in · ${p.ms} ms`}</span>
        </p>
        <span
          className={cn(
            "inline-flex h-26 items-center gap-6 rounded-8 px-10 text-[12.5px] font-[600]",
            p.sealed ? "bg-bg-inverse text-text-inverse" : "bg-bg-up-soft text-text-up",
          )}
        >
          {p.sealed ? <Lock className="size-13" /> : <LockOpen className="size-13" />}
          {p.sealed ? "Sealed" : "Revealed"}
        </span>
      </div>
      <div className="mt-12">
        <Request peek={p} />
      </div>
      {p.sealed ? (
        <p className="mt-12 text-[14.5px] leading-[1.55] text-text-secondary text-pretty">
          <span className="font-[600] text-text-primary">Nothing to see.</span> To anyone outside the
          round&apos;s permission list, the round doesn&apos;t exist yet: no close, no pools, no
          calls.{" "}
          {opensIn > 0 ? `It opens at the reveal, in ${opensIn} s.` : "It opens any second now."}
        </p>
      ) : r ? (
        <>
          <p className="mt-12 text-[14.5px] leading-[1.55] text-text-secondary">
            <span className="font-[600] text-text-primary">The seal is open.</span> Same request,
            now readable by anyone.
          </p>
          <Facts r={r} />
        </>
      ) : null}
    </div>
  );
}

function Facts({ r }: { r: RoundResult }) {
  return (
    <dl className="mt-12 grid grid-cols-2 gap-x-16 gap-y-8 text-[13.5px] sm:grid-cols-4">
      <div>
        <dt className="text-text-tertiary">Secret close</dt>
        <dd className="font-[600]">
          {mmss(r.closeS)} {r.verified && <span className="text-text-up">✓</span>}
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">Calls</dt>
        <dd className="font-[600]">
          {r.calls.length} · {r.upPool + r.downPool} USDC
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">Keeper&apos;s secret</dt>
        <dd className="font-code text-[12.5px]">{short(r.secret, 8)}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">MagicBlock VRF</dt>
        <dd className="font-code text-[12.5px]">{r.vrf ? short(r.vrf, 8) : "late, not used"}</dd>
      </div>
    </dl>
  );
}

/** The same request for the round that just ended: proof the empty answer is the seal. */
function Compare({ peek: p }: { peek: Peek }) {
  return (
    <div className="rounded-16 px-4 pt-4">
      <p className="text-[13.5px] leading-[1.5] text-text-secondary">
        <span className="font-[600] text-text-primary">Is the request broken?</span> No. The same
        request for round {p.round.toLocaleString("en-US")}, which just ended, comes back in full:
      </p>
      {p.result ? (
        <Facts r={p.result} />
      ) : (
        <p className="mt-6 text-[13.5px] text-text-tertiary">
          That round hasn&apos;t been revealed yet either. Try again in a few seconds.
        </p>
      )}
    </div>
  );
}
