"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/cms", label: "Site CMS" },
  { href: "/staff/applications", label: "Applications" },
  { href: "/staff/pilots", label: "Pilots" },
  { href: "/staff/inactive", label: "Inactive" },
  { href: "/staff/pireps", label: "PIREPs" },
  { href: "/staff/flights", label: "Flights" },
  { href: "/staff/stats", label: "Stats" },
  { href: "/staff/events", label: "Events" },
  { href: "/staff/codeshares", label: "Codeshares" },
  { href: "/staff/operations", label: "Career · Cargo" },
  { href: "/staff/loa", label: "LOA" },
  { href: "/staff/reports", label: "Reports" },
];

export function CrewTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-obsidian/40 px-6 lg:px-10">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative px-4 py-3 text-sm transition-colors ${
              active ? "text-cream" : "text-cream-faint hover:text-cream-dim"
            }`}
          >
            {t.label}
            {active && (
              <span className="absolute bottom-0 left-2 right-2 h-px bg-gold-soft" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
