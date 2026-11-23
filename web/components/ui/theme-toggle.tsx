"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemePreference } from "@/lib/theme";

/** Header button: flips between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setPreference } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "flex size-44 items-center justify-center rounded-10 text-text-primary transition-colors hover:bg-bg-secondary",
        className,
      )}
    >
      {/* Shown/hidden by the theme attribute on <html>, so it's right before hydration. */}
      <Moon className="size-18 in-data-[theme=dark]:hidden" aria-hidden />
      <Sun className="hidden size-18 in-data-[theme=dark]:block" aria-hidden />
    </button>
  );
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Settings control: system, light or dark. */
export function ThemeChoice() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="flex flex-wrap gap-6">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={cn(
            "flex h-32 items-center gap-6 rounded-8 px-12 font-mono text-[12px] transition-colors",
            preference === value
              ? "bg-bg-brand text-text-on-color"
              : "text-text-secondary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] hover:bg-bg-secondary hover:text-text-primary",
          )}
        >
          <Icon className="size-14" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
