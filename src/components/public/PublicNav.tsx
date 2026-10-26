"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PUBLIC_NAV } from "@/lib/site";
import { ThemeToggle } from "../ThemeToggle";

export function PublicNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`sticky top-0 z-50 border-b bg-ink-950 transition-shadow duration-300 ${scrolled ? "border-obsidian/70 shadow-[0_4px_24px_-12px_rgba(8,4,30,0.35)]" : "border-obsidian/40"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center" aria-label="Xiamen Air Virtual">
          <Image src="/brand/xav-logo-light.png" alt="Xiamen Air Virtual" width={1080} height={287} priority className="logo-light-theme h-9 w-auto transition-transform duration-500 group-hover:scale-105" />
          <Image src="/brand/xav-logo-dark.png" alt="Xiamen Air Virtual" width={1985} height={528} priority className="logo-dark-theme h-9 w-auto transition-transform duration-500 group-hover:scale-105" />
        </Link>

        <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
          {PUBLIC_NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-gold/8 text-gold" : "text-cream-dim hover:text-cream"}`}>{item.label}</Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
          <ThemeToggle />
          <Link href="/crew" className="hidden rounded-full border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/8 sm:inline-flex">Crew Centre</Link>
          <Link href="/join" className="hidden rounded-full bg-gold px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_-10px_rgba(12,2,67,0.8)] transition-all hover:brightness-125 sm:inline-flex">Apply Now</Link>
          <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full border border-obsidian text-cream-dim lg:hidden">
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 block h-px w-full bg-current transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-all ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 block h-px w-full bg-current transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Brand-gradient accent line — a touch of colour under the nav */}
      <div aria-hidden className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#12B5A8,#3B6FE0 45%,#A855C7 80%,#D9A441)" }} />

      <div className={`overflow-hidden border-t border-obsidian/60 bg-ink-950 transition-all duration-300 lg:hidden ${open ? "max-h-[90vh]" : "max-h-0"}`}>
        <nav className="flex flex-col gap-0.5 px-5 py-4">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-dim hover:bg-ink-850 hover:text-cream">{item.label}</Link>
          ))}
          <Link href="/crew" className="mt-2 rounded-full border border-gold/40 px-5 py-2.5 text-center text-sm font-medium text-gold">Crew Centre</Link>
          <Link href="/join" className="mt-1 rounded-full bg-gold px-5 py-2.5 text-center text-sm font-medium text-white">Apply Now</Link>
        </nav>
      </div>
    </header>
  );
}
