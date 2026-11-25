import { cn } from "@/lib/cn";

/**
 * Blindside mark: a glossy, extruded blue tile. A white price line runs to
 * "now" and stops at a dashed line; everything after it sits behind frosted
 * glass — the hidden close.
 *
 * The gradient ids are shared by every instance on a page; the definitions are
 * identical, so that's safe.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-32", className)} aria-hidden>
      <defs>
        <linearGradient id="bs-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7E99FF" />
          <stop offset="0.55" stopColor="#2E5BFF" />
          <stop offset="1" stopColor="#2149E6" />
        </linearGradient>
        <linearGradient id="bs-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B3CCF" />
          <stop offset="1" stopColor="#0C2286" />
        </linearGradient>
        <linearGradient id="bs-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bs-fog" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.36" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.5" />
        </linearGradient>
        <clipPath id="bs-clip">
          <rect x="4" y="3" width="56" height="52" rx="15" />
        </clipPath>
      </defs>

      {/* Depth */}
      <rect x="4" y="8" width="56" height="52" rx="15" fill="url(#bs-side)" />
      {/* Face */}
      <rect x="4" y="3" width="56" height="52" rx="15" fill="url(#bs-face)" />

      <g clipPath="url(#bs-clip)">
        <ellipse cx="30" cy="2" rx="38" ry="19" fill="url(#bs-gloss)" />
        {/* The future, behind frosted glass */}
        <rect x="37" y="3" width="23" height="52" fill="url(#bs-fog)" />
        <path
          d="M36 24 L43 30 L50 21"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="0.1 5.2"
        />
        {/* Now */}
        <line
          x1="37"
          y1="9"
          x2="37"
          y2="49"
          stroke="#fff"
          strokeOpacity="0.75"
          strokeWidth="1.3"
          strokeDasharray="2 2.6"
        />
        {/* The price so far */}
        <path
          d="M11 38 L18 31 L24 35 L34 23"
          fill="none"
          stroke="#fff"
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="34" cy="23" r="3.8" fill="#fff" />

      {/* Rim light */}
      <rect
        x="4.4"
        y="3.4"
        width="55.2"
        height="51.2"
        rx="14.6"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-8", className)}>
      <LogoMark className="size-28" />
      <span className="text-[16px] leading-[20px] font-[700] tracking-[-0.03em]">Blindside</span>
    </span>
  );
}
