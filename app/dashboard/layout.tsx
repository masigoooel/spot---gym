import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { NavLinks, NavList } from "@/components/dashboard/NavLinks";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const bot = process.env.NEXT_PUBLIC_BOT_USERNAME;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-spot-line bg-spot-sidebar px-4 py-4 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:gap-8 md:border-b-0 md:border-r md:px-5 md:py-7">
        <Link href="/dashboard" aria-label="spot. ringkasan" className="self-start pl-2 text-[28px] leading-none md:text-[32px]">
          <Logo />
        </Link>
        <Suspense fallback={<NavList />}>
          <NavLinks />
        </Suspense>
        {bot && (
          <div className="mt-auto hidden flex-col gap-3 rounded-[14px] border border-spot-line p-4 md:flex">
            <span className="text-[13px] leading-snug text-spot-muted">catat set langsung dari telegram.</span>
            <a
              href={`https://t.me/${bot}`}
              className="flex min-h-11 items-center justify-center rounded-full bg-spot-orange text-sm font-semibold text-spot-bg transition-colors hover:bg-spot-orange-dark"
            >
              buka bot
            </a>
          </div>
        )}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
