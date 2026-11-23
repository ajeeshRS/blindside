import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { SettingsForm } from "@/components/app/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-[720px]">
      <PageHeader
        kicker="Preferences"
        title="Settings"
        description="Saved on this device. Limits apply to staked calls only."
      />
      <SettingsForm />
    </div>
  );
}
