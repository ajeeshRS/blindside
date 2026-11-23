"use client";

import { SectionTitle } from "@/components/app/app-shell";
import { Surface } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";
import { ThemeChoice } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { updateSettings, useSettings } from "@/lib/settings";

const TIME_OPTIONS = [null, 15, 30, 60] as const;
const LOSS_OPTIONS = [null, 10, 25, 50] as const;

export function SettingsForm() {
  const s = useSettings();

  return (
    <div className="flex flex-col gap-32">
      <section>
        <SectionTitle>Appearance</SectionTitle>
        <Surface className="px-20 py-14">
          <p className="text-[15px] leading-[21px] font-[600]">Theme</p>
          <p className="mt-2 text-[13px] leading-[19px] text-text-secondary">
            Dark mode uses a pure black background. System follows your device.
          </p>
          <div className="mt-12">
            <ThemeChoice />
          </div>
        </Surface>
      </section>

      <section>
        <SectionTitle>Feedback</SectionTitle>
        <Surface className="divide-y divide-border-secondary px-20">
          <Switch
            id="sound"
            label="Sound"
            description="A click when you call, a soft tick while the close could happen, and a tone at the reveal."
            checked={s.sound}
            onChange={(v) => updateSettings({ sound: v })}
          />
          <Switch
            id="haptics"
            label="Haptics"
            description="Light vibration on calls and reveals, on phones that support it."
            checked={s.haptics}
            onChange={(v) => updateSettings({ haptics: v })}
          />
          <Switch
            id="motion"
            label="Reduce motion"
            description="Replaces the fog and reveal animations with simple fades. Follows your system setting when off."
            checked={s.motion === "reduced"}
            onChange={(v) => updateSettings({ motion: v ? "reduced" : "system" })}
          />
          <Switch
            id="free"
            label="Start in free calls"
            description="Open the app with stake set to zero."
            checked={s.defaultFreeCalls}
            onChange={(v) => updateSettings({ defaultFreeCalls: v })}
          />
        </Surface>
      </section>

      <section>
        <SectionTitle>Limits</SectionTitle>
        <Surface className="divide-y divide-border-secondary px-20">
          <Choice
            label="Session time"
            description="After this long, staked calls pause until you confirm you want to keep going."
            options={TIME_OPTIONS.map((v) => ({ value: v, label: v ? `${v} min` : "None" }))}
            value={s.sessionMinutes}
            onChange={(v) => updateSettings({ sessionMinutes: v })}
          />
          <Choice
            label="Session loss"
            description="Staked calls stop for the session once you've lost this much."
            options={LOSS_OPTIONS.map((v) => ({ value: v, label: v ? `${v} USDC` : "None" }))}
            value={s.sessionLossUsdc}
            onChange={(v) => updateSettings({ sessionLossUsdc: v })}
          />
        </Surface>
      </section>
    </div>
  );
}

function Choice({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description: string;
  options: { value: number | null; label: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="py-14">
      <p className="text-[15px] leading-[21px] font-[600]">{label}</p>
      <p className="mt-2 text-[13px] leading-[19px] text-text-secondary">{description}</p>
      <div role="radiogroup" aria-label={label} className="mt-12 flex flex-wrap gap-6">
        {options.map((o) => (
          <button
            key={o.label}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-32 rounded-8 px-12 font-mono text-[12px] tabular transition-colors",
              value === o.value
                ? "bg-bg-brand text-text-on-color"
                : "text-text-secondary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] hover:bg-bg-secondary hover:text-text-primary",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
