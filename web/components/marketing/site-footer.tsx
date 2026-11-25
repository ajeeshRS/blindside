import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/play", label: "Play" },
      { href: "/history", label: "History" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/fair", label: "How it's fair" },
      { href: "/history", label: "Verify a round" },
    ],
  },
  {
    title: "Built on",
    links: [
      { href: "https://docs.magicblock.gg", label: "MagicBlock Private ER" },
      { href: "https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/introduction/technical-details", label: "MagicBlock VRF" },
      { href: "https://docs.pyth.network/lazer", label: "Pyth Lazer" },
      { href: "https://solana.com", label: "Solana" },
    ],
  },
];

/** Dark footer with the link columns and the name set large underneath. */
export function SiteFooter() {
  return (
    <footer className="dark mx-12 mb-12 overflow-hidden rounded-32 pt-64 md:mx-16 md:mb-16 md:pt-88">
      <div className="container-page">
        <div className="grid gap-x-20 gap-y-40 md:grid-cols-[2fr_repeat(3,1fr)]">
          <div className="flex flex-col items-start gap-16">
            <Link href="/" aria-label="Blindside home">
              <Logo />
            </Link>
            <p className="max-w-[280px] text-[14px] leading-[21px] text-text-secondary">
              90-second SOL calls with a close nobody can see coming.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-label text-text-tertiary">{g.title}</h3>
              <ul className="mt-16 flex flex-col gap-10">
                {g.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-[14px] leading-[20px] text-text-primary transition-opacity hover:opacity-70"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-64 flex flex-col gap-10 border-t border-line pt-20 text-[13px] text-text-tertiary md:mt-80 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Blindside · Devnet build for MagicBlock Solana Blitz v10</p>
          <p>Prices and proofs are real · Devnet USDC has no value</p>
        </div>
      </div>
      <p
        aria-hidden
        className="mt-24 -mb-[0.22em] text-center font-display text-[25vw] leading-[0.9] tracking-[-0.04em] text-white/[0.07] select-none"
      >
        Blindside
      </p>
    </footer>
  );
}
