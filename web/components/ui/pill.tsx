import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "up" | "down" | "brand" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-bg-secondary text-text-secondary",
  up: "bg-bg-up-soft text-text-up",
  down: "bg-bg-down-soft text-text-down",
  brand: "bg-bg-brand-soft text-text-brand",
  warning: "bg-[hsl(var(--yellow-30)/18%)] text-text-warning",
};

export function Pill({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-24 items-center gap-6 rounded-6 px-8 font-mono text-[11px] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function LiveDot({ status }: { status: "live" | "stale" | "off" }) {
  return (
    <span className="relative inline-flex size-8" aria-hidden>
      {status === "live" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-bg-up opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex size-8 rounded-full",
          status === "live" && "bg-bg-up",
          status === "stale" && "bg-[hsl(var(--yellow-30))]",
          status === "off" && "bg-text-tertiary",
        )}
      />
    </span>
  );
}
