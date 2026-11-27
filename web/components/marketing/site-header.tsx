import { Play } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { capsuleIcon } from "@/components/ui/capsule-icon";
import { NavCapsule } from "@/components/ui/nav-capsule";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/fair", label: "Fairness" },
  { href: "/history", label: "Verify" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <NavCapsule links={links} label="Main">
      <ThemeToggle className={capsuleIcon()} />
      <ButtonLink href="/play" size="sm" className="h-38" icon={<Play className="size-13 fill-current" />}>
        Play now
      </ButtonLink>
    </NavCapsule>
  );
}
