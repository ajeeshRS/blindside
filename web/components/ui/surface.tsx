import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Soft grey card on the white page. */
export function Surface({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("frame", className)} {...props} />;
}

/** A white tile inside a soft card. */
export function Inset({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("tile", className)} {...props} />;
}

/** Kept for existing call sites: same as Surface. */
export const Well = Surface;
