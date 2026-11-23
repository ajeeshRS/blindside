"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-16 py-14">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[15px] leading-[21px] font-[600]">
          {label}
        </label>
        {description && (
          <p className="mt-2 text-[13px] leading-[19px] text-text-secondary">{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-24 w-42 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-bg-brand" : "bg-bg-tertiary",
        )}
      >
        <span
          className={cn(
            "inline-block size-20 rounded-full bg-bg-primary shadow-dropdown transition-transform duration-200 ease-out-expo",
            checked ? "translate-x-20" : "translate-x-2",
          )}
        />
      </button>
    </div>
  );
}
