import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/play", label: "Play" },
      { href: "/prints", label: "Prints" },
      { href: "/standings", label: "Standings" },
      { href: "/history", label: "History" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/fair", label: "How it's fair" },
      { href: "/history", label: "Verify a round" },
      { href: "/settings", label: "Settings" },
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

/**
 * Dark footer, as on Mobbin. It tucks under the rounded bottom of the section
 * above it; the `.dark` class rescopes the color tokens.
 */
export function SiteFooter() {
  return (
    <footer className="dark -mt-40 pb-32 pt-96 md:pt-120">
      <div className="container-page">
        <div className="grid gap-x-20 gap-y-40 md:grid-cols-[2fr_repeat(3,1fr)]">
          <Link href="/" aria-label="Blindside home" className="self-start">
            <Logo />
          </Link>
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-label text-text-tertiary">{g.title}</h3>
              <ul className="mt-14 flex flex-col gap-8">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] leading-[20px] text-text-primary transition-opacity hover:opacity-80"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-64 flex flex-col gap-10 border-t border-border-secondary pt-20 text-label text-text-tertiary md:mt-80 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Blindside. Devnet build for MagicBlock Solana Blitz v10.</p>
          <p>Prices and proofs are real. Devnet USDC has no value.</p>
        </div>
      </div>
    </footer>
  );
}
