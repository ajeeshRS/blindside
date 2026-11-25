"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";


/*
 * Floating capsule nav: solid ink (no blur), centred, sticky 16px below the
 * top. Radius 16 with 6px padding, so the 10px items inside sit concentric.
 * The `dark` class rescopes tokens, so buttons inside render light-on-ink in
 * both themes.
 */
export function NavCapsule({
  links,
  children,
  label,
}: {
  links: { href: string; label: string }[];
  children: ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="pointer-events-none sticky top-12 z-40 flex justify-center px-12 md:top-16">
      <div className="dark pointer-events-auto flex h-50 w-full max-w-max items-center gap-4 rounded-16 p-6 shadow-nav max-md:justify-between">
        <Link
          href="/"
          aria-label="Blindside home"
          className="flex h-38 shrink-0 items-center gap-8 rounded-10 pr-10 pl-2 transition-colors hover:bg-white/10"
        >
          <LogoMark className="size-30" />
          <span className="text-[15px] font-[700] tracking-[-0.03em]">Blindside</span>
        </Link>
        <span className="mx-6 h-20 w-px bg-white/15 max-md:hidden" aria-hidden />
        <nav aria-label={label} className="flex items-center gap-2 max-md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={cn(
                "flex h-38 items-center rounded-10 px-12 text-[14px] font-[500] transition-colors",
                active(l.href)
                  ? "bg-white/12 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 md:ml-10">{children}</div>
      </div>
    </div>
  );
}
