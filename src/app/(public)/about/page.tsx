import Image from "next/image";
import Link from "next/link";
import { SITE_LEADERS, SITE_ORG } from "@/lib/site";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-20">
      <header className="reveal">
        <p className="eyebrow">About</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream lg:text-5xl">A virtual airline built like a real one.</h1>
        <p className="lead mt-4 max-w-3xl text-lg text-cream-dim">Xiamen Air Virtual (XMV) is an independent Infinite Flight virtual airline inspired by Xiamen Air. We fly a structured, simulated operation out of Xiamen Gaoqi — every flight logged, every hour credited, every rank earned.</p>
        <p className="mt-4 max-w-3xl leading-relaxed text-cream-dim">From your first Horizon sortie to the Luminary command seat, pilots progress through nine ranks, purchase fleet licences and codeshare networks with Strait Points, and fly across passenger, career and cargo operations. Behind the scenes, a real org structure — executive leadership and four staff units — keeps the airline running with Coastal precision and a genuinely welcoming community at its heart.</p>
      </header>

      {/* Our journey — milestone timeline */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">Our journey</h2>
        <p className="mt-1 max-w-2xl text-sm text-cream-dim">From a single idea to a full simulated operation — and where we&apos;re heading next.</p>
        <ol className="relative mt-6 space-y-6 border-l border-obsidian pl-6">
          {[
            { phase: "The vision", title: "An airline built like a real one", body: "Xiamen Air Virtual sets out to build a Coastal-precision VA — structured operations, a real org chart, and a genuinely welcoming community." },
            { phase: "Foundation", title: "The Crew Centre takes off", body: "A full pilot portal goes live: personal logbooks, a daily dispatch board, the route database and a live network map." },
            { phase: "Economy", title: "Ranks, Strait Points & Egret Miles", body: "Nine ranks, the Strait Points economy and five Egret Miles tiers give every logged hour a meaningful reward." },
            { phase: "Operations", title: "Career & Cargo modes", body: "Two structured ways to fly — a rostered passenger career and a freight track paying Logistic Coins — plus codeshare networks." },
            { phase: "Today", title: "Live operations & Egret", body: "The Live Fleet system and the Egret in-app assistant bring the airline to life for every pilot." },
            { phase: "Roadmap", title: "Where we're heading", body: "Expanding the SkyTeam network and codeshare partners, growing the events & group-flight calendar, and welcoming our next intake of pilots and staff.", roadmap: true },
          ].map((m, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[1.84rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-ink-950 ${m.roadmap ? "bg-rose" : "bg-gold"}`} />
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold-soft">{m.phase}</p>
              <h3 className="mt-0.5 font-display text-lg font-semibold text-cream">{m.title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cream-dim">{m.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Leadership — pfp + message + IFC link */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">Leadership</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {(SITE_LEADERS.length ? SITE_LEADERS : [
            { role: "Founder & CEO", name: "Vacant", pfp: "/brand/xav-emblem.png" },
            { role: "Chief Operating Officer", name: "Vacant", pfp: "/brand/xav-emblem.png" },
          ]).map((l) => (
            <div key={l.role} className="rounded-xl border border-obsidian bg-ink-900 p-6 lift">
              <div className="flex items-center gap-4">
                <Image src={l.pfp ?? "/brand/xav-emblem.png"} alt={l.name} width={120} height={120} className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-obsidian" />
                <div>
                  <p className="font-display text-lg font-semibold text-cream">{l.name}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-gold-soft">{l.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-cream-dim">“{"message" in l ? l.message : "This seat is open — applications welcome."}”</p>
            </div>
          ))}
        </div>
      </section>

      {/* Org chart */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">Organisation</h2>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-gold/40 bg-gold/[0.03] p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-cream-faint">Founder & CEO</p>
            <p className="font-display text-lg font-semibold text-cream">Vacant</p>
          </div>
          <div className="rounded-2xl border border-obsidian bg-ink-900 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-cream-faint">Chief Operating Officer</p>
            <p className="font-display text-lg font-semibold text-cream">Vacant</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SITE_ORG.map((u) => (
              <div key={u.unit} className="rounded-2xl border border-obsidian bg-ink-900 p-5">
                <p className="font-display text-base font-semibold text-cream">{u.unit}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {u.roles.map((r, i) => (
                    <li key={i} className="flex items-center justify-between border-t border-obsidian/50 pt-2">
                      <span className="text-cream-dim">{r.role}</span>
                      <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[0.65rem] uppercase text-cream-faint">{r.who}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-sm text-cream-dim">Interested in one of the vacant roles?</p>
          <Link href="/join" className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-125">Apply for Staff <span aria-hidden>→</span></Link>
        </div>
      </section>

      {/* SkyTeam alliance */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">A SkyTeam partner</h2>
        <p className="mt-1 text-sm text-cream-dim">Connecting our pilots to the global SkyTeam alliance network.</p>
        {/* Shown as-is (its own oval lockup) — no extra rounded frame, so the
            container edge can't clash with the image outline on any screen. */}
        <div className="mt-5">
          <Image src="/brand/skyteam-lockup.svg" alt="Xiamen Air · SkyTeam alliance partners" width={1200} height={260} className="mx-auto block h-auto w-full" />
        </div>
        <p className="mt-3 text-xs text-cream-faint">Xiamen Air Virtual is a virtual airline for Infinite Flight and is not affiliated with Xiamen Air or the SkyTeam alliance.</p>
      </section>
    </div>
  );
}
