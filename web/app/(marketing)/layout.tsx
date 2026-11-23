import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="relative z-[2] rounded-b-40 bg-bg-primary">{children}</main>
      <SiteFooter />
    </>
  );
}
