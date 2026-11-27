import { Play } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { SiteHeader } from "@/components/marketing/site-header";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex min-h-[calc(100svh-66px)] flex-col items-center justify-center py-64 text-center">
        <LogoMark className="size-56" />
        <h1 className="text-display mt-24 text-[44px] md:text-[64px]">Nothing here.</h1>
        <p className="mt-14 max-w-[420px] text-[17px] leading-[1.6] text-text-secondary">
          This page doesn&apos;t exist. The next round does, and it opens every 90 seconds.
        </p>
        <div className="mt-28 flex flex-wrap justify-center gap-10">
          <ButtonLink href="/play" size="lg" icon={<Play className="size-14 fill-current" />}>
            Play now
          </ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
