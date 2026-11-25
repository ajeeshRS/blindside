import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "brand" | "secondary" | "inverse" | "ghost" | "up" | "down";
type Size = "sm" | "md" | "lg" | "xl";

/** Rounded rectangles, not pills: radius steps with size so nested shapes stay concentric. */
const base =
  "relative inline-flex select-none items-center justify-center gap-8 whitespace-nowrap font-[600] tracking-[-0.01em] transition-[background-color,color,box-shadow,transform] duration-150 ease-standard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--accent)/35%)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  /** Ink: the one main action. White in dark mode. */
  primary: "bg-bg-inverse text-text-inverse hover:bg-bg-inverse-hover",
  brand: "bg-bg-brand text-text-on-color hover:bg-bg-brand-hover",
  inverse: "bg-bg-primary text-text-primary hover:bg-bg-soft",
  secondary: "bg-bg-secondary text-text-primary hover:bg-bg-secondary-hover",
  ghost: "text-text-primary hover:bg-bg-secondary",
  up: "bg-bg-up text-text-on-color hover:brightness-110",
  down: "bg-bg-down text-text-on-color hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-36 rounded-10 px-14 text-[14px]",
  md: "h-44 rounded-12 px-18 text-[15px]",
  lg: "h-52 rounded-16 px-24 text-[16px]",
  xl: "h-60 rounded-16 px-28 text-[17px]",
};

type Common = { variant?: Variant; size?: Size; icon?: ReactNode; className?: string };

export function buttonClass({ variant = "primary", size = "md", className }: Common = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

function Icon({ icon }: { icon?: ReactNode }) {
  if (!icon) return null;
  return <span className="-ml-2 flex shrink-0 items-center">{icon}</span>;
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = "button",
  ...props
}: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} {...props}>
      <Icon icon={icon} />
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props}>
      <Icon icon={icon} />
      {children}
    </Link>
  );
}
