import Link from "next/link";
import { SITE } from "@/lib/site";
import { RANKS } from "@/lib/career";

export const metadata = { title: "Career" };

/* What a pilot actually does day-to-day at XMV. */
const DO = [
  { icon: "M5 19 19 5M10 5h9v9", title: "Fly real-world routes", body: `Pick from ${SITE.network.routes} scheduled sectors out of Xiamen — short domestic hops to ultra-long-haul to Asia and across the Atlantic.` },
  { icon: "M4 4h16v16H4zM8 9h8M8 13h6", title: "File PIREPs & build a logbook", body: "Every flight you fly is logged, reviewed and credited. Your hours, routes and history follow you for your whole career." },
  { icon: "M12 2v20M5 9l7-7 7 7", title: "Earn Strait Points", body: "Each approved Career-mode flight pays out Strait Points — the currency you spend on licences, aircraft and codeshare networks." },
  { icon: "M17 2.1l4 4-4 4M3 12.6v-2a4 4 0 014-4h14M7 21.9l-4-4 4-4M21 11.4v2a4 4 0 01-4 4H3", title: "Group flights & events", body: "Fly together at scheduled community events and group flights — including special livery fly-ins across the network." },
  { icon: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5", title: "Run cargo contracts", body: "Senior pilots take on freight runs from Xiamen and Fuzhou, earning Logistic Coins on long technical sectors." },
  { icon: "M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z", title: "Earn special clearances", body: "Reach the exclusive ranks for Special Operations access, the SkyTeam network and custom callsigns." },
];

/* The simple gameplay loop that ties everything together. */
const LOOP = [
  { n: "1", title: "Fly a route", body: "Choose a sector and fly it in Infinite Flight." },
  { n: "2", title: "File your PIREP", body: "Log the flight; staff approve it." },
  { n: "3", title: "Earn Strait Points", body: "Get paid by aircraft class & duration." },
  { n: "4", title: "Unlock & climb", body: "Spend AP on licences, aircraft and codeshares — and rise through the ranks." },
];

/* Where to go deeper — these LINK OUT rather than repeat the detail. */
const GROW = [
  { tag: "Choose how you fly", title: "Three flight modes", body: "Casual, Career and Cargo — switch any time as your rank and schedule change.", href: "/modes" },
  { tag: "Climb the ladder", title: "Nine ranks", body: "From Horizon to Luminary across 5,000 hours — each rank unlocks more of the fleet.", href: "/ranks" },
  { tag: "Bank your points", title: "Egret Miles tiers", body: "Your lifetime Strait Points carry you through five recognition tiers.", href: "/plus" },
];

/* Tools waiting in the Crew Centre. */
const TOOLS = ["Personal logbook & stats", "Daily dispatch board", "One-click SimBrief flight plans", "Pilot leaderboard", "Codeshare network browser", "Egret — your in-app assistant"];

export default function CareerPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-20">
      <header className="reveal">
        <p className="eyebrow">Life at Xiamen Air Virtual</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream lg:text-5xl">More than a flight log — a place to fly.</h1>
        <p className="lead mt-4 max-w-2xl text-cream-dim">Xiamen Air Virtual gives every pilot a structured, rewarding way to spend their time in Infinite Flight. Here&apos;s what you&apos;ll actually do with us, what we offer, and how you grow from your very first flight.</p>
      </header>

      {/* What you'll do */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">What you&apos;ll do</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DO.map((d, i) => (
            <div key={d.title} className="rise rounded-2xl border border-obsidian bg-ink-900 p-5 lift" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold-soft">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d.icon} /></svg>
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-cream">{d.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The loop */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-cream">How it all connects</h2>
        <p className="mt-1 text-sm text-cream-dim">Your whole career runs on one simple, repeating loop.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl border border-obsidian bg-ink-900 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-display text-sm font-semibold text-white">{s.n}</span>
              <h3 className="mt-3 font-display text-base font-semibold text-cream">{s.title}</h3>
              <p className="mt-1 text-sm text-cream-dim">{s.body}</p>
              {i < LOOP.length - 1 && <span aria-hidden className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-gold-soft lg:block">→</span>}
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-gold/30 bg-gold/[0.04] px-5 py-3 text-sm text-cream-dim">↻ Repeat, and your logbook, balance and rank all grow together — fly at your own pace, no pressure to rush.</p>
      </section>

      {/* The economy, made simple */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-cream">One ladder, two wallets</h2>
        <p className="mt-1 max-w-2xl text-sm text-cream-dim">It&apos;s simpler than it looks. Your <span className="text-cream">flight hours</span> decide your rank — and there are just <span className="text-cream">two currencies</span>, one for each kind of flying.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { sym: "⏱", label: "Flight hours", tag: "Your rank", body: "Every verified hour climbs the nine-rank ladder. Hours aren't spent — they track your seniority and unlock new aircraft.", accent: "#3B6FE0" },
            { sym: "✦", label: "Strait Points · AP", tag: "Passenger track", body: "Earned only on Career-mode flights. Spend them on pilot licences, passenger codeshare networks, and your Egret Miles tier.", accent: "#8A6BF0" },
            { sym: "◈", label: "Logistic Coins · LC", tag: "Cargo track", body: "Earned only on Cargo contracts. Spend them on cargo certifications and freight codeshares. Kept entirely separate from AP.", accent: "#C2528E" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-obsidian bg-ink-900 p-5" style={{ borderTop: `3px solid ${c.accent}` }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: `color-mix(in srgb, ${c.accent} 16%, transparent)`, color: c.accent }}>{c.sym}</span>
                <div>
                  <p className="font-display text-base font-semibold text-cream">{c.label}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>{c.tag}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The nine ranks at a glance */}
      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold text-cream">The nine ranks</h2>
          <Link href="/ranks" className="text-sm text-gold-soft hover:underline">Full rank ladder →</Link>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-cream-dim">Your flight hours move you up a nine-rank ladder — each one unlocking more of the fleet and new privileges.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
          {RANKS.map((r) => (
            <div key={r.name} className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${r.group === "exclusive" ? "border-rose/30 bg-rose/[0.04]" : "border-obsidian bg-ink-900"}`}>
              <span className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-cream-faint">{String(r.n).padStart(2, "0")}</span>
                <span className="font-medium text-cream">{r.name}</span>
              </span>
              <span className="text-xs text-cream-faint">{r.hours.toLocaleString()}h</span>
            </div>
          ))}
        </div>
      </section>

      {/* Where you grow — links out */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-cream">Where you&apos;ll grow</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {GROW.map((g, i) => (
            <Link key={g.title} href={g.href} className="rise group rounded-2xl border border-obsidian bg-ink-900 p-6 lift" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-soft">{g.tag}</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-cream">{g.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream-dim">{g.body}</p>
              <span className="mt-4 inline-block text-sm text-gold-soft transition-transform group-hover:translate-x-1">Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="mt-14 rounded-3xl border border-obsidian bg-ink-900 p-7 lg:p-9">
        <h2 className="font-display text-2xl font-semibold text-cream">Everything in one Crew Centre</h2>
        <p className="mt-1 text-sm text-cream-dim">Once you&apos;re in, your whole operation lives in a single pilot dashboard.</p>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-sm text-cream-dim"><span className="text-gold-soft">✓</span>{t}</li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-obsidian bg-ink-900 px-6 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold text-cream">Ready to start your ascent?</h2>
        <p className="max-w-lg text-sm text-cream-dim">Apply in minutes, fly your first sector, and watch your career take off from Horizon.</p>
        <Link href="/join" className="btn-shine-blue rounded-full bg-gold px-7 py-3 text-sm font-semibold text-white transition-all hover:brightness-125">Apply now</Link>
      </section>
    </div>
  );
}
