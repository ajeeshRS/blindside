"use client";

import { useEffect, useRef } from "react";
import { Fog } from "@/components/market/fog";
import { priceFeed, usePriceFeed } from "@/lib/price-feed";
import { scheduleAt } from "@/lib/schedule";
import { cn } from "@/lib/cn";

type Props = {
  /** Visible time window in seconds. */
  windowSeconds?: number;
  className?: string;
  /** Draw price labels on the right edge. */
  showAxis?: boolean;
  ariaLabel?: string;
  /** Seconds of not-yet-happened time to show to the right of "now", under fog. */
  futureSeconds?: number;
  /** Stroke width of the price line. */
  lineWidth?: number;
  /** Draw horizontal grid lines. */
  showGrid?: boolean;
  /**
   * Shade the round's hidden-close window (from the 90 s schedule) and draw a
   * solid "now" line. Sets `--band-l`, `--band-r`, `--band-c` for overlays.
   */
  closeWindow?: boolean;
  /**
   * A revealed round to draw instead of the hidden band: the close line, the
   * starting price and the 30 s that decided it. Sets `--close-x`, `--strike-y`,
   * `--end-x`, `--settle-y` for overlays.
   */
  reveal?: RevealMarks | null;
  /** Overlays positioned with the `--now-x` / `--now-y` / `--band-*` CSS variables. */
  children?: React.ReactNode;
};

export type RevealMarks = {
  /** When the starting price was recorded (ms). */
  closeMs: number;
  /** When the result price was recorded (ms), or null if the round voided first. */
  endMs: number | null;
  strike: number | null;
  settle: number | null;
  outcome: "up" | "down" | "void";
  /** When the reveal started showing (ms), for the draw-in animation. */
  at: number;
  /** Skip the animation (reduced motion). */
  instant?: boolean;
};

const MIN_SPAN_MS = 4_000;

/**
 * Resolve an HSL-triplet CSS variable (which may itself point at another
 * variable) to an rgba() string canvas understands, scoped to `el`.
 */
function cssColor(el: Element, name: string, alpha = 1) {
  const probe = document.createElement("span");
  probe.style.color = `hsl(var(${name}))`;
  probe.style.display = "none";
  el.appendChild(probe);
  const rgb = getComputedStyle(probe).color; // "rgb(r, g, b)" or "rgba(r, g, b, a)"
  probe.remove();
  const nums = rgb.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  const [r, g, b, a = 1] = nums;
  return `rgba(${r}, ${g}, ${b}, ${(a * alpha).toFixed(3)})`;
}

/**
 * Canvas chart of the live SOL/USD feed. Redraws on animation frames from the
 * shared feed buffer, so React never re-renders per tick.
 */
export function LiveChart({
  windowSeconds = 90,
  className,
  showAxis = true,
  ariaLabel,
  futureSeconds = 0,
  lineWidth = 2,
  showGrid = true,
  closeWindow = false,
  reveal = null,
  children,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read by the draw loop every frame, so changing it doesn't restart the loop.
  const revealRef = useRef<RevealMarks | null>(reveal);
  revealRef.current = reveal;
  const wrapRef = useRef<HTMLDivElement>(null);
  const feed = usePriceFeed();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let colors = readColors();
    let font = "12px sans-serif";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function readColors() {
      const el = canvas!;
      return {
        line: cssColor(el, "--chart-line"),
        area: cssColor(el, "--chart-line", 0.07),
        grid: cssColor(el, "--text-tertiary", 0.18),
        label: cssColor(el, "--text-tertiary"),
        dot: cssColor(el, "--chart-line"),
        ring: cssColor(el, "--chart-line", 0.18),
        band: cssColor(el, "--brand-50", 0.07),
        hatch: cssColor(el, "--brand-50", 0.14),
        bandEdge: cssColor(el, "--brand-50", 0.55),
        now: cssColor(el, "--text-primary"),
        brand: cssColor(el, "--chart-line"),
        up: cssColor(el, "--text-up"),
        upSoft: cssColor(el, "--text-up", 0.12),
        down: cssColor(el, "--text-down"),
        downSoft: cssColor(el, "--text-down", 0.12),
        muted: cssColor(el, "--text-tertiary"),
      };
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      font = `500 11px ${getComputedStyle(document.body).fontFamily}`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Re-read colors when the theme changes (system or the in-app toggle).
    const onScheme = () => (colors = readColors());
    const themeObserver = new MutationObserver(onScheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    let raf = 0;
    let smoothMin = NaN;
    let smoothMax = NaN;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      const ticks = priceFeed.getTicks();
      const now = Date.now();
      // Grow the window as data arrives, so a fresh page isn't a sliver at the edge.
      const have = ticks.length ? now - ticks[0].t : 0;
      const span = Math.min(Math.max(have, MIN_SPAN_MS), windowSeconds * 1000);
      const start = now - span;
      // Keep the future zone in proportion to the visible past, so the line
      // fills the same share of the width while the window is still growing.
      const sched = closeWindow ? scheduleAt(now) : null;
      const futureMs = sched
        ? Math.max(sched.windowTo - now + 8_000, 12_000)
        : (futureSeconds / windowSeconds) * span;
      const total = span + futureMs;
      const axisW = showAxis ? 64 : 0;
      const plotW = Math.max(0, width - axisW - 12);
      const top = 16;
      const bottom = height - 16;

      const visible = ticks.filter((t) => t.t >= start - 2_000);
      if (visible.length === 0) return;

      const rv = revealRef.current;
      let min = Infinity;
      let max = -Infinity;
      for (const t of visible) {
        if (t.price < min) min = t.price;
        if (t.price > max) max = t.price;
      }
      // Keep the revealed prices on screen.
      for (const p of [rv?.strike, rv?.settle]) {
        if (p == null) continue;
        if (p < min) min = p;
        if (p > max) max = p;
      }
      const pad = Math.max((max - min) * 0.25, max * 0.0002);
      min -= pad;
      max += pad;
      // Ease the scale so the line doesn't jump when the range changes.
      smoothMin = Number.isNaN(smoothMin) ? min : smoothMin + (min - smoothMin) * 0.12;
      smoothMax = Number.isNaN(smoothMax) ? max : smoothMax + (max - smoothMax) * 0.12;

      const x = (t: number) => ((t - start) / total) * plotW;
      wrapRef.current?.style.setProperty("--now-x", `${x(now)}px`);
      wrapRef.current?.style.setProperty("--axis-w", `${axisW}px`);
      const y = (p: number) => bottom - ((p - smoothMin) / (smoothMax - smoothMin)) * (bottom - top);

      // A revealed round replaces the hidden band.
      if (rv) {
        const k = (delay: number, dur = 500) =>
          rv.instant ? 1 : Math.min(1, Math.max(0, (now - rv.at - delay) / dur));
        const ease = (v: number) => 1 - Math.pow(1 - v, 3);
        const cx = x(rv.closeMs);
        const ex = rv.endMs ? x(rv.endMs) : null;
        const tint = rv.outcome === "up" ? colors.upSoft : rv.outcome === "down" ? colors.downSoft : null;
        const ink = rv.outcome === "up" ? colors.up : rv.outcome === "down" ? colors.down : colors.muted;
        wrapRef.current?.style.setProperty("--close-x", `${cx}px`);
        if (ex !== null) wrapRef.current?.style.setProperty("--end-x", `${ex}px`);

        // 1. The close drops in.
        const p1 = ease(k(0, 450));
        ctx.strokeStyle = colors.brand;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.round(cx) + 0.5, 0);
        ctx.lineTo(Math.round(cx) + 0.5, height * p1);
        ctx.stroke();

        if (rv.strike !== null) {
          const sy = y(rv.strike);
          wrapRef.current?.style.setProperty("--strike-y", `${sy}px`);
          // 2. The 30 s that decided it, tinted by the outcome.
          if (ex !== null && tint) {
            const p2 = ease(k(450, 700));
            ctx.fillStyle = tint;
            ctx.fillRect(cx, 0, (ex - cx) * p2, height);
          }
          // 3. The starting price, drawn across.
          const p3 = ease(k(450, 700));
          const to = ex ?? x(now);
          ctx.strokeStyle = colors.brand;
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, Math.round(sy) + 0.5);
          ctx.lineTo(cx + (to - cx) * p3, Math.round(sy) + 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(cx, sy, 4.5 * p1, 0, Math.PI * 2);
          ctx.fillStyle = colors.brand;
          ctx.fill();
        }
        // 4. The result 30 s later.
        if (ex !== null && rv.settle !== null) {
          const p4 = ease(k(1150, 400));
          const ty = y(rv.settle);
          wrapRef.current?.style.setProperty("--settle-y", `${ty}px`);
          ctx.strokeStyle = ink;
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(Math.round(ex) + 0.5, height);
          ctx.lineTo(Math.round(ex) + 0.5, height - height * p4);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(ex, ty, 5.5 * p4, 0, Math.PI * 2);
          ctx.fillStyle = ink;
          ctx.fill();
        }
      }

      // Hidden-close window, under everything else
      if (sched && !rv) {
        const bl = Math.max(0, x(sched.windowFrom));
        const br = Math.min(plotW, x(sched.windowTo));
        wrapRef.current?.style.setProperty("--band-l", `${bl}px`);
        wrapRef.current?.style.setProperty("--band-r", `${br}px`);
        wrapRef.current?.style.setProperty("--band-c", `${(bl + br) / 2}px`);
        if (br > bl) {
          ctx.fillStyle = colors.band;
          ctx.fillRect(bl, 0, br - bl, height);
          ctx.save();
          ctx.beginPath();
          ctx.rect(bl, 0, br - bl, height);
          ctx.clip();
          ctx.strokeStyle = colors.hatch;
          ctx.lineWidth = 1;
          for (let hx = bl - height; hx < br; hx += 10) {
            ctx.beginPath();
            ctx.moveTo(hx, height);
            ctx.lineTo(hx + height, 0);
            ctx.stroke();
          }
          ctx.restore();
          ctx.strokeStyle = colors.bandEdge;
          ctx.setLineDash([4, 4]);
          for (const ex of [bl, br]) {
            if (ex <= 0 || ex >= plotW) continue;
            ctx.beginPath();
            ctx.moveTo(Math.round(ex) + 0.5, 0);
            ctx.lineTo(Math.round(ex) + 0.5, height);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }

      // Grid + labels
      ctx.font = font;
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 3; i++) {
        const p = smoothMin + ((smoothMax - smoothMin) * i) / 3;
        const gy = y(p);
        if (showGrid) {
          ctx.strokeStyle = colors.grid;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, Math.round(gy) + 0.5);
          ctx.lineTo(plotW, Math.round(gy) + 0.5);
          ctx.stroke();
        }
        if (showAxis) {
          ctx.fillStyle = colors.label;
          ctx.fillText(`$${p.toFixed(3)}`, plotW + 12, gy);
        }
      }

      // Line (step-free, last value extended to now)
      const last = visible[visible.length - 1];
      ctx.beginPath();
      visible.forEach((t, i) => {
        const px = Math.max(0, x(t.t));
        const py = y(t.price);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      const endX = x(now);
      ctx.lineTo(endX, y(last.price));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Soft area under the line
      ctx.lineTo(endX, bottom);
      ctx.lineTo(Math.max(0, x(visible[0].t)), bottom);
      ctx.closePath();
      ctx.fillStyle = colors.area;
      ctx.fill();

      if (sched) {
        ctx.strokeStyle = colors.now;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.round(endX) + 0.5, 28);
        ctx.lineTo(Math.round(endX) + 0.5, height);
        ctx.stroke();
      } else if (futureSeconds > 0) {
        ctx.strokeStyle = colors.grid;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(Math.round(endX) + 0.5, top);
        ctx.lineTo(Math.round(endX) + 0.5, bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Live point
      const ly = y(last.price);
      wrapRef.current?.style.setProperty("--now-y", `${ly}px`);
      const pulse = (now % 1600) / 1600;
      ctx.beginPath();
      ctx.arc(endX, ly, lineWidth + 2 + pulse * 12, 0, Math.PI * 2);
      ctx.fillStyle = cssAlpha(colors.ring, 1 - pulse);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, ly, lineWidth + 2, 0, Math.PI * 2);
      ctx.fillStyle = colors.dot;
      ctx.fill();
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver.disconnect();
    };
  }, [windowSeconds, showAxis, futureSeconds, lineWidth, showGrid, closeWindow]);

  const waiting = !feed.last;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {!closeWindow && futureSeconds > 0 && feed.last && (
        <Fog
          className={cn(
            "left-[var(--now-x)]",
            showAxis ? "right-[calc(var(--axis-w)+12px)]" : "right-0",
          )}
        />
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={ariaLabel ?? `Live SOL price over the last ${windowSeconds} seconds`}
      />
      {feed.last && children}
      {waiting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-subtle text-text-tertiary">
            {feed.status === "error" ? feed.error : "Connecting to the live SOL feed…"}
          </p>
        </div>
      )}
    </div>
  );
}

/** Scale the alpha of an rgba() string. */
function cssAlpha(color: string, factor: number) {
  return color.replace(/,\s*([\d.]+)\)$/, (_, a) => `, ${(parseFloat(a) * factor).toFixed(3)})`);
}
