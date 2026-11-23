import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "inverse" | "ghost" | "up" | "down";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "relative inline-flex select-none items-center justify-center gap-8 rounded-10 whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 ease-standard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--brand-50)/40%)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "bg-bg-brand text-text-on-color shadow-[inset_0_1px_0_hsl(0_0%_100%/22%),0_10px_24px_-10px_hsl(var(--brand-50)/70%)] hover:bg-bg-brand-hover",
  inverse:
    "bg-bg-inverse text-text-inverse shadow-[0_10px_24px_-10px_hsl(0_0%_0%/45%)] hover:bg-bg-inverse-hover",
  secondary:
    "bg-bg-primary text-text-primary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] hover:bg-bg-secondary",
  ghost: "text-text-primary hover:bg-bg-secondary",
  up: "bg-bg-up text-text-on-color hover:brightness-110",
  down: "bg-bg-down text-text-on-color hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-36 px-14 text-subtle-bold",
  md: "h-44 px-16 text-body-bold",
  lg: "h-52 px-20 text-body-bold",
  xl: "h-60 px-24 text-headline",
};

type Common = { variant?: Variant; size?: Size; icon?: ReactNode; className?: string };

export function buttonClass({ variant = "primary", size = "md", className }: Common = {}) {
  return cn(base, variants[variant], sizes[size], className);
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
      {icon}
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
      {icon}
      {children}
    </Link>
  );
}
