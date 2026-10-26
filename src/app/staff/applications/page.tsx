import { listRoster, latestAcceptedAt } from "@/lib/db";
import { LINKS } from "@/lib/data";
import { getLatestGuildJoin } from "@/lib/discord";
import { applicationCount } from "@/lib/applications";
import { CrewPilotActions } from "@/components/CrewPilotActions";

export const dynamic = "force-dynamic";

export default async function CrewApplications() {
  // "New" = filed after the last person joined the server (Discord last-join,
  // else the most recent acceptance in our roster).
  const [guildJoin, accepted] = await Promise.all([
    getLatestGuildJoin(),
    latestAcceptedAt(),
  ]);
  const cutoff = guildJoin ?? accepted;

  const [pending, pilot, staff] = await Promise.all([
    listRoster("pending"),
    applicationCount(LINKS.pilotResponsesSheetId, cutoff),
    applicationCount(LINKS.staffResponsesSheetId, cutoff),
  ]);

  const cards = [
    { label: "Pilot applications", count: pilot, href: LINKS.pilotApplicationReview },
    { label: "Staff applications", count: staff, href: LINKS.staffApplicationReview },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <h2 className="font-display text-2xl font-semibold text-cream">
        Application inbox
      </h2>
      <p className="mt-2 text-sm text-cream-dim">
        New = submitted after the most recent member joined the server. Open a
        form to read and respond to its submissions.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-obsidian/50 bg-ink-900 p-7 transition-colors hover:border-gold/40 hover:bg-ink-850"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-cream-faint">
              {c.label}
            </p>
            <p
              className={`mt-3 font-display text-5xl font-semibold ${
                c.count.newCount > 0 ? "gold-text" : "text-cream"
              }`}
            >
              {c.count.newCount}
            </p>
            <p className="mt-1 text-sm text-cream-dim">
              {c.count.known ? "new" : "total"} application
              {c.count.newCount === 1 ? "" : "s"} · {c.count.total} all-time
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-gold-soft transition-transform duration-300 group-hover:translate-x-1">
              Open form & respond <span aria-hidden>↗</span>
            </span>
          </a>
        ))}
      </div>

      {!cutoff && (
        <p className="mt-4 text-xs text-cream-faint">
          Showing all-time totals — connect the Discord bot (Server Members
          intent) or accept a pilot so we can mark the &ldquo;new&rdquo; cutoff.
        </p>
      )}

      {/* ---- Site sign-ups awaiting acceptance ---- */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-cream">
        Pending pilots
        <span className="ml-3 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 align-middle text-sm text-gold-soft">
          {pending.length}
        </span>
      </h2>
      <p className="mt-2 text-sm text-cream-dim">
        Pilots who signed in on the site but haven&apos;t been accepted yet.
      </p>

      <div className="mt-6 space-y-3">
        {pending.length === 0 && (
          <div className="rounded-2xl border border-dashed border-obsidian/60 bg-ink-900 p-10 text-center text-sm text-cream-faint">
            No pending pilots. ✦
          </div>
        )}
        {pending.map(({ pilot: p }) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-obsidian/50 bg-ink-900 p-6"
          >
            <div>
              <p className="font-display text-xl font-semibold text-cream">
                {p.callsign}
              </p>
              <p className="text-sm text-cream-dim">{p.displayName}</p>
              <p className="mt-1 font-mono text-xs text-cream-faint">
                {p.ifUsername ? `IF: ${p.ifUsername}` : "No IF username yet"}
              </p>
            </div>
            <CrewPilotActions pilotId={p.id} actions={["accept", "reject"]} />
          </div>
        ))}
      </div>
    </section>
  );
}
