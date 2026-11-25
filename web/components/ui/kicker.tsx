import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Grey kicker above a heading, marked with a small accent square. */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-8 text-kicker text-text-secondary", className)}>
      <span className="size-[7px] shrink-0 rounded-[2px] bg-accent" aria-hidden />
      {children}
    </p>
  );
}
