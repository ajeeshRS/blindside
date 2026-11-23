import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/fair", label: "Fairness" },
  { href: "/#faq", label: "FAQ" },
];

const navLink =
  "-mx-12 flex h-36 items-center px-12 text-label text-text-secondary transition-colors ease-out hover:text-text-primary";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-secondary bg-bg-primary/85 backdrop-blur-xl">
      <div className="container-page flex h-60 items-center justify-between gap-16">
        <div className="flex items-center gap-40">
          <Link
            href="/"
            aria-label="Blindside home"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-24 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={navLink}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-8">
          <ThemeToggle className="size-36" />
          <ButtonLink href="/play" size="sm">
            Play now
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
