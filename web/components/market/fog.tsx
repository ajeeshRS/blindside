import { cn } from "@/lib/cn";

/**
 * Fog band: marks time where information doesn't exist yet. Only ever placed
 * over the part of a chart a hidden close could fall in.
 *
 * Layers: a soft gradient that thickens to the right, slowly drifting grain,
 * and a faint sweep that passes through every few seconds — something is in
 * there, you just can't see where.
 */
export function Fog({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-y-0 overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 12%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, hsl(var(--fog) / 0) 0%, hsl(var(--fog) / 0.75) 18%, hsl(var(--fog) / 0.95) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 40%, hsl(var(--brand-50) / 0.06), transparent 70%), radial-gradient(50% 60% at 75% 70%, hsl(var(--brand-50) / 0.05), transparent 70%)",
        }}
      />
      <svg className="fog-drift absolute -inset-[20%] size-[140%] opacity-35 mix-blend-multiply">
        <filter id="fog-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fog-grain)" />
      </svg>
      <div className="fog-sweep absolute inset-y-0 w-[45%]" />
    </div>
  );
}
