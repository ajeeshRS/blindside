"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { LiveDot } from "@/components/ui/pill";
import { Panel } from "@/components/ui/panel";
import { ER_HTTP_URL, SOL_USD_FEED, erExplorerUrl } from "@/lib/config";
import { formatAge } from "@/lib/format";
import { usePriceFeed } from "@/lib/price-feed";
import { useNow } from "@/lib/use-now";

export function FeedHealth() {
  const feed = usePriceFeed();
  const now = useNow();
  const age = feed.last && now ? now - feed.last.t : null;
  const status = feed.status === "live" ? "live" : feed.status === "stale" ? "stale" : "off";
  const label =
    feed.status === "live"
      ? "Live"
      : feed.status === "stale"
        ? "Paused"
        : feed.status === "error"
          ? "Unavailable"
          : "Connecting";

  const rows: [string, ReactNode][] = [
    [
      "Status",
      <span key="s" className="inline-flex items-center gap-8">
        <LiveDot status={status} />
        {label}
      </span>,
    ],
    ["Last update", age === null ? "—" : formatAge(age)],
    [
      "Updates",
      feed.updatesPerSecond ? `${feed.updatesPerSecond.toFixed(1)} per second` : "—",
    ],
    [
      "Transport",
      feed.transport === "websocket"
        ? "Websocket"
        : feed.transport === "polling"
          ? "Polling"
          : "—",
    ],
    [
      "Confidence",
      !feed.last ? "—" : feed.last.conf > 0 ? `± $${feed.last.conf.toFixed(4)}` : "Not published",
    ],
    ["Rollup", new URL(ER_HTTP_URL).host],
  ];

  return (
    <Panel
      label="Price feed"
      meta={
        <a
          href={erExplorerUrl(SOL_USD_FEED.toBase58())}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-4 text-label text-text-secondary hover:text-text-primary"
        >
          Feed account <ExternalLink className="size-12" />
        </a>
      }
    >
      <div className="px-16 pt-4 pb-8 md:px-20">
      <dl className="divide-y divide-border-secondary">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-12 py-10">
            <dt className="text-[13px] text-text-secondary">{k}</dt>
            <dd className="text-right font-mono text-[13px] tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {feed.error && <p className="mt-8 text-caption text-text-down">{feed.error}</p>}
      </div>
    </Panel>
  );
}
