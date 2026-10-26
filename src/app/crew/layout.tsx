import Link from "next/link";
import { getPilotDashboard, fmtApCompact, fmtLcCompact } from "@/lib/portal";
import { PortalNav, type NavSummary } from "@/components/portal/PortalNav";
import { PilotLogin } from "@/components/portal/PilotLogin";
import { SessionGuard } from "@/components/portal/SessionGuard";
import { BRAND } from "@/lib/data";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // The Crew Centre is protected by each pilot's own sign-in (IFC username +
  // passcode) — no shared preview password in front of it, so any rostered
  // pilot can reach their flight deck directly.
  const d = await getPilotDashboard();
  // No real pilot session (and no shared demo pilot once the DB is live) → ask
  // the pilot to sign in with their IFC username + passcode.
  if (!d || d.session.demo) return <PilotLogin />;
  const summary: NavSummary | null = d
    ? {
        callsign: d.session.callsign,
        displayName: d.session.displayName,
        rankName: d.rank.current.name,
        tierName: d.tier.current.name,
        tierAccent: d.tier.current.accent,
        apCompact: fmtApCompact(d.apBalance),
        lcCompact: fmtLcCompact(d.lcBalance),
        gates: { specialOps: d.gates.specialOps, discover: d.gates.discover },
        isStaff: d.session.isStaff,
        demo: !!d.session.demo,
      }
    : null;

  return (
    <div className="flex min-h-full flex-col">
      <SessionGuard />
      <PortalNav summary={summary} />
      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-obsidian bg-ink-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-cream">Xiamen Air Virtual</span>
            <span className="hidden text-cream-faint sm:inline">·</span>
            <span className="hidden font-mono text-xs text-cream-faint sm:inline">{BRAND.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-cream-faint">
            <Link href="/crew/ranks" className="hover:text-cream">Ranks</Link>
            <Link href="/crew/routes" className="hover:text-cream">Routes</Link>
            <Link href="/crew/leaderboard" className="hover:text-cream">Leaderboard</Link>
            <Link href="/staff" className="hover:text-cream">Staff Centre</Link>
          </div>
        </div>
        <p className="mx-auto max-w-7xl px-5 pb-7 text-[0.7rem] leading-relaxed text-cream-faint lg:px-8">
          {BRAND.disclaimer}
        </p>
      </footer>
    </div>
  );
}
