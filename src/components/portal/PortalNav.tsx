"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../ThemeToggle";
import { ZuluClock } from "../ZuluClock";
import { NotificationBell } from "./NotificationBell";

export type NavSummary = {
  callsign: string;
  displayName: string;
  rankName: string;
  tierName: string;
  tierAccent: string;
  apCompact: string;
  lcCompact: string;
  gates: { specialOps: boolean; discover: boolean };
  isStaff: boolean;
  demo: boolean;
};

const PRIMARY = [
  { href: "/crew", label: "Dashboard" },
  { href: "/crew/career", label: "Career" },
  { href: "/crew/cargo", label: "Cargo" },
  { href: "/crew/routes", label: "Routes" },
  { href: "/crew/fleet", label: "Live Fleet" },
  { href: "/crew/logbook", label: "Logbook" },
];

export function PortalNav({ summary }: { summary: NavSummary | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setMenu(false);
    setDrawer(false);
  }, [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials =
    summary?.callsign.replace(/[^A-Za-z0-9]/g, "").slice(-2).toUpperCase() ?? "FN";

  const more = [
    { href: "/crew/ranks", label: "Rank ladder" },
    { href: "/crew/map", label: "Live Map", lock: false },
    { href: "/crew/discover", label: "SkyTeam Discover", lock: summary ? !summary.gates.discover : true },
    { href: "/crew/leaderboard", label: "Leaderboard" },
    { href: "/crew/loa", label: "Request LOA" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-obsidian/70" : "bg-ink-950 border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 lg:px-8">
        {/* Brand */}
        <Link href="/crew" className="group flex shrink-0 items-center" aria-label="Xiamen Air Virtual">
          <Image src="/brand/xav-logo-light.png" alt="Xiamen Air Virtual" width={1080} height={287}
            className="logo-light-theme h-8 w-auto transition-transform duration-500 group-hover:scale-105" priority />
          <Image src="/brand/xav-logo-dark.png" alt="Xiamen Air Virtual" width={1985} height={528}
            className="logo-dark-theme h-8 w-auto transition-transform duration-500 group-hover:scale-105" priority />
        </Link>

        {/* Primary nav */}
        <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
          {PRIMARY.map((item) => {
            const active = item.href === "/crew" ? pathname === "/crew" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-gold/8 text-gold" : "text-cream-dim hover:text-cream"
                }`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {/* Balance chips — Strait Points + Logistic Coins */}
          {summary && (
            <Link href="/crew/logbook"
              className="hidden items-stretch overflow-hidden rounded-full border border-obsidian bg-ink-900 text-sm lift sm:inline-flex"
              title="Strait Points · Logistic Coins balance">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5">
                <span className="shine font-semibold">✦</span>
                <span className="tnum font-semibold text-cream">{summary.apCompact}</span>
                <span className="text-xs text-cream-faint">AP</span>
              </span>
              <span className="inline-flex items-center gap-1.5 border-l border-obsidian px-3 py-1.5">
                <span className="font-semibold text-rose">◈</span>
                <span className="tnum font-semibold text-cream">{summary.lcCompact}</span>
                <span className="text-xs text-cream-faint">LC</span>
              </span>
            </Link>
          )}

          {/* File PIREP */}
          <Link href="/crew/file"
            className="hidden rounded-full bg-gold px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-10px_rgba(12,2,67,0.8)] transition-all hover:brightness-125 sm:inline-flex">
            File PIREP
          </Link>

          <ZuluClock className="hidden text-xs text-cream-dim lg:inline-flex" />
          {summary && <NotificationBell />}
          <ThemeToggle />

          {/* Profile menu */}
          {summary && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-obsidian bg-ink-900 py-1 pl-1 pr-2.5 lift"
                aria-label="Profile menu">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-semibold text-white"
                  style={{ background: summary.tierAccent }}>{initials}</span>
                <span className="hidden text-xs font-medium text-cream-dim md:inline">{summary.rankName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-cream-faint"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {menu && (
                <div className="pop absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-obsidian bg-ink-900 shadow-[0_24px_60px_-20px_rgba(12,2,67,0.45)]">
                  <div className="border-b border-obsidian/70 px-4 py-3">
                    <p className="text-sm font-semibold text-cream">{summary.callsign}</p>
                    <p className="text-xs text-cream-faint">{summary.displayName}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold text-white" style={{ background: summary.tierAccent }}>{summary.tierName}</span>
                      <span className="rounded-full border border-obsidian px-2 py-0.5 text-[0.65rem] text-cream-dim">{summary.rankName}</span>
                    </div>
                  </div>
                  <div className="py-1.5">
                    {more.map((m) => (
                      <Link key={m.href} href={m.href}
                        className="flex items-center justify-between px-4 py-2 text-sm text-cream-dim transition-colors hover:bg-ink-850 hover:text-cream">
                        {m.label}
                        {m.lock && <span className="text-[0.65rem] text-cream-faint">🔒</span>}
                      </Link>
                    ))}
                    {summary.isStaff && (
                      <Link href="/staff" className="flex items-center justify-between px-4 py-2 text-sm text-gold transition-colors hover:bg-ink-850">
                        Staff Centre <span aria-hidden>→</span>
                      </Link>
                    )}
                    <a href="/api/auth/logout" className="block px-4 py-2 text-sm text-cream-faint transition-colors hover:bg-ink-850 hover:text-cream">Sign out</a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile toggle */}
          <button aria-label="Menu" onClick={() => setDrawer((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-obsidian text-cream-dim lg:hidden">
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 block h-px w-full bg-current transition-all ${drawer ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-all ${drawer ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 block h-px w-full bg-current transition-all ${drawer ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`overflow-hidden border-t border-obsidian/60 bg-ink-950 transition-all duration-300 lg:hidden ${drawer ? "max-h-[80vh]" : "max-h-0"}`}>
        <nav className="flex flex-col gap-0.5 px-5 py-4">
          {[...PRIMARY, { href: "/crew/file", label: "File PIREP" }].map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-dim hover:bg-ink-850 hover:text-cream">{item.label}</Link>
          ))}
          {more.map((m) => (
            <Link key={m.href} href={m.href} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-cream-dim hover:bg-ink-850 hover:text-cream">{m.label}{m.lock && <span className="text-xs">🔒</span>}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
