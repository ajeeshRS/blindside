"use client";

import { History, Images, LineChart, Settings, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConnectButton } from "@/components/wallet/connect-button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/play", label: "Play", icon: LineChart },
  { href: "/prints", label: "Prints", icon: Images },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/history", label: "History", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border-secondary bg-bg-primary/85 backdrop-blur-xl">
        <div className="container-page flex h-60 items-center justify-between gap-16">
          <div className="flex items-center gap-40">
            <Link href="/" aria-label="Blindside home">
              <Logo />
            </Link>
            <nav aria-label="App" className="hidden items-center gap-24 md:flex">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "-mx-12 flex h-36 items-center px-12 text-label transition-colors ease-out",
                    isActive(href)
                      ? "text-text-primary"
                      : "text-text-tertiary hover:text-text-primary",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-8">
            <ThemeToggle className="hidden size-36 sm:flex" />
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={isActive("/settings") ? "page" : undefined}
              className={cn(
                "flex size-36 items-center justify-center rounded-10 transition-colors",
                isActive("/settings")
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-primary hover:bg-bg-secondary",
              )}
            >
              <Settings className="size-18" />
            </Link>
            <ConnectButton size="sm" />
          </div>
        </div>
      </header>

      <main className="container-page flex-1 pb-[calc(96px+env(safe-area-inset-bottom))] pt-16 md:pb-64 md:pt-24">
        {children}
      </main>

      {/* Mobile tab bar: every primary destination in the thumb zone */}
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border-secondary bg-bg-primary/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex h-56 flex-col items-center justify-center gap-4 font-mono text-[11px] transition-colors",
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
    <div className="mb-24 flex flex-col gap-16 md:mb-32 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[640px]">
        {kicker && (
          <p className="frame mb-14 inline-flex px-12 py-6 text-label text-text-secondary">{kicker}</p>
        )}
        <h1 className="text-[30px] leading-[1.08] font-[652] tracking-[-0.8px] md:text-[38px] md:tracking-[-1.1px]">
          {title}
        </h1>
        {description && (
          <p className="mt-8 text-[15px] leading-[22px] text-text-secondary text-pretty">
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
    <div className="mb-14">
      {index && <p className="text-label text-text-tertiary">{index}</p>}
      <h2 className="mt-4 text-[20px] leading-[26px] font-[652] tracking-[-0.3px]">{children}</h2>
      {description && (
        <p className="mt-6 max-w-[620px] text-[15px] leading-[22px] text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}
