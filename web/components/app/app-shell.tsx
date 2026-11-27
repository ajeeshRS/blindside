"use client";

import { History, LineChart, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { capsuleIcon } from "@/components/ui/capsule-icon";
import { NavCapsule } from "@/components/ui/nav-capsule";
import { Kicker } from "@/components/ui/kicker";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConnectButton } from "@/components/wallet/connect-button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/play", label: "Play", icon: LineChart },
  { href: "/history", label: "History", icon: History },
  { href: "/fair", label: "Fairness", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col">
      <NavCapsule links={NAV.map(({ href, label }) => ({ href, label }))} label="App">
        <ThemeToggle className={capsuleIcon("max-sm:hidden")} />
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={capsuleIcon(isActive("/settings") && "bg-white/12 text-white")}
        >
          <Settings className="size-16" />
        </Link>
        <ConnectButton size="sm" className="h-38" />
      </NavCapsule>

      <main
        className={cn(
          "container-page flex-1 pb-[calc(96px+env(safe-area-inset-bottom))] pt-32 md:pb-96 md:pt-56",
          // Play is a terminal: wider, with less air above it.
          isActive("/play") && "max-w-[1480px]! pt-24 md:pt-40 lg:pb-16",
        )}
      >
        {children}
      </main>

      {/* Mobile tab bar: every primary destination in the thumb zone */}
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-primary pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex h-56 flex-col items-center justify-center gap-4 text-[11px] font-[600] transition-colors",
                  isActive(href) ? "text-text-primary" : "text-text-tertiary",
                )}
              >
                <Icon className="size-20" strokeWidth={isActive(href) ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-40 flex flex-col gap-16 md:mb-56 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[720px]">
        {kicker && <Kicker className="mb-14">{kicker}</Kicker>}
        <h1 className="text-display text-[44px] md:text-[64px]">
          {title}
        </h1>
        {description && (
          <p className="mt-16 max-w-[600px] text-[17px] leading-[27px] text-text-secondary text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}

/** A titled block inside an app page. */
export function SectionTitle({
  index,
  children,
  description,
}: {
  index?: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-20">
      {index && <p className="mb-6 text-label text-text-secondary">{index}</p>}
      <h2 className="text-[26px] leading-[1.15] font-[700] tracking-[-0.035em]">{children}</h2>
      {description && (
        <p className="mt-8 max-w-[620px] text-[15.5px] leading-[24px] text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}
