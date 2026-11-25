import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A card with an optional labelled header row. */
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
    <Tag className={cn("frame flex flex-col overflow-hidden", className)}>
      {(label || meta) && (
        <header className="flex min-h-44 items-center justify-between gap-12 px-20 pt-14 md:px-24 md:pt-16">
          {label && <h2 className="text-label text-text-secondary">{label}</h2>}
          {meta}
        </header>
      )}
      {children}
    </Tag>
  );
}
