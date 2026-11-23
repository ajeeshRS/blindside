import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Blueprint card: crop-mark frame with hairline sides on the page background. */
export function Surface({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("frame border-x border-border-secondary bg-bg-primary", className)}
      {...props}
    />
  );
}

/** A quiet tinted area inside a card. */
export function Inset({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-8 bg-bg-secondary", className)} {...props} />;
}

/** Kept for existing call sites: same as Surface. */
export const Well = Surface;
