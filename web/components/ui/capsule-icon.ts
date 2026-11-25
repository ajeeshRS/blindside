import { cn } from "@/lib/cn";

/** Classes for a square icon button in the capsule. */
export function capsuleIcon(...extra: (string | false | undefined)[]) {
  return cn(
    "flex size-38 items-center justify-center rounded-10 text-white/75 transition-colors hover:bg-white/10 hover:text-white",
    ...extra,
  );
}
