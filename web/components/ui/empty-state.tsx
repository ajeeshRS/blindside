import type { ReactNode } from "react";
import { Surface } from "./surface";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Surface className="relative flex flex-col items-center overflow-hidden px-24 py-48 text-center md:py-64">
      <div
        aria-hidden
        className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(ellipse_45%_60%_at_50%_40%,black_10%,transparent)]"
      />
      <div className="relative mb-16 flex size-44 items-center justify-center rounded-10 bg-bg-primary text-text-primary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))]">
        {icon}
      </div>
      <h2 className="relative text-[20px] leading-[26px] font-[652] tracking-[-0.3px] text-balance">
        {title}
      </h2>
      <p className="relative mt-8 max-w-[420px] text-[15px] leading-[22px] text-text-secondary text-pretty">
        {body}
      </p>
      {action && <div className="relative mt-20">{action}</div>}
    </Surface>
  );
}
