import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Blueprint panel: crop-mark frame with hairline sides, an optional mono
 * header row split from the body by a dashed rule.
 */
export function Panel({
  label,
  meta,
  className,
  children,
  as: Tag = "section",
}: {
  label?: ReactNode;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "aside";
}) {
  return (
    <Tag className={cn("frame flex flex-col border-x border-border-secondary bg-bg-primary", className)}>
      {(label || meta) && (
        <header className="flex min-h-44 items-center justify-between gap-12 border-b border-dashed border-border-secondary-hover px-16 py-8 md:px-20">
          {label && <h2 className="text-label text-text-secondary">{label}</h2>}
          {meta}
        </header>
      )}
      {children}
    </Tag>
  );
}
