import Link from "next/link";
import { crewStats } from "@/lib/db";
import { formatDuration } from "@/lib/rank";

export default async function CrewDashboard() {
  const s = await crewStats();

  const cards = [
    { label: "Active pilots", value: String(s.activePilots), href: "/staff/pilots" },
    { label: "Pending applications", value: String(s.pendingPilots), href: "/staff/applications", alert: s.pendingPilots > 0 },
    { label: "PIREPs to review", value: String(s.pendingPireps), href: "/staff/pireps", alert: s.pendingPireps > 0 },
    { label: "Hours flown", value: formatDuration(s.totalMinutes), href: "/staff/pilots" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-2xl border bg-ink-900 p-7 transition-colors hover:bg-ink-850 ${
              c.alert ? "border-gold/50" : "border-obsidian/50 hover:border-gold/40"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-cream-faint">
              {c.label}
            </p>
            <p
              className={`mt-3 font-display text-4xl font-semibold ${
                c.alert ? "gold-text" : "text-cream"
              }`}
            >
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <QuickLink
          href="/staff/applications"
          title="Review applications"
          body="Accept new pilots into the airline and assign them their starting rank."
        />
        <QuickLink
          href="/staff/pireps"
          title="Review PIREPs"
          body="Approve or reject filed pilot reports. Approved hours credit toward rank."
        />
      </div>
    </section>
  );
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-obsidian/50 bg-ink-900 p-7 transition-colors hover:border-gold/40 hover:bg-ink-850"
    >
      <h2 className="font-display text-2xl font-semibold text-cream">{title}</h2>
      <p className="mt-2 text-sm text-cream-dim">{body}</p>
      <span className="mt-4 inline-block text-sm text-gold-soft transition-transform duration-300 group-hover:translate-x-1">
        Open →
      </span>
    </Link>
  );
}
