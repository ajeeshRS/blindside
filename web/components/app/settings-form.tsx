"use client";

import { SectionTitle } from "@/components/app/app-shell";
import { Surface } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";
import { ThemeChoice } from "@/components/ui/theme-toggle";
import { updateSettings, useSettings } from "@/lib/settings";

/** Only settings that actually do something. */
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
            id="haptics"
            label="Haptics"
            description="A short vibration when a round is revealed, on phones that support it."
            checked={s.haptics}
            onChange={(v) => updateSettings({ haptics: v })}
          />
          <Switch
            id="motion"
            label="Reduce motion"
            description="Shows the reveal and other animations without movement. Follows your system setting when off."
            checked={s.motion === "reduced"}
            onChange={(v) => updateSettings({ motion: v ? "reduced" : "system" })}
          />
        </Surface>
      </section>
    </div>
  );
}
