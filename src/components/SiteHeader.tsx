"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type Session = {
  callsign: string;
  displayName: string;
  isStaff: boolean;
  demo?: boolean;
} | null;

/* Slim brand bar for the Staff. The crew layout renders its own
   title + tabs underneath, so this stays minimal: logo, theme toggle, and
   a sign-out control when a staff session is active. */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<Session>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => active && setSession(d.session ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-ink-950/85 backdrop-blur-xl border-b border-obsidian/40"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-10">
        <Link href="/staff" className="group flex shrink-0 items-center gap-2.5" aria-label="Xiamen Air Virtual Staff — home">
          {/* Navy wordmark on light backgrounds, white on dark */}
          <Image src="/brand/xav-logo-light.png" alt="Xiamen Air Virtual" width={1080} height={287} priority
            className="logo-light-theme h-8 w-auto transition-transform duration-500 group-hover:scale-105" />
          <Image src="/brand/xav-logo-dark.png" alt="Xiamen Air Virtual" width={1985} height={528} priority
            className="logo-dark-theme h-8 w-auto transition-transform duration-500 group-hover:scale-105" />
          <span className="hidden rounded-full border border-gold/40 px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-gold-soft sm:inline">
            Staff
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          {session && (
            <>
              <span className="hidden items-center gap-2 rounded-full border border-obsidian/60 px-4 py-2 text-sm text-cream-dim sm:inline-flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-[0.65rem] text-gold-soft">
                  {session.callsign.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate">{session.callsign}</span>
              </span>
              <a
                href="/api/auth/logout"
                className="rounded-full border border-obsidian/60 px-4 py-2 text-sm text-cream-dim transition-colors hover:text-cream"
              >
                Sign out
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
