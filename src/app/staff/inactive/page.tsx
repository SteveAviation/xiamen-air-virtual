import { listInactivePilots } from "@/lib/db";

export const dynamic = "force-dynamic";

const THRESHOLD = 31;

export default async function InactivePilotsPage() {
  const inactive = await listInactivePilots(THRESHOLD);

  return (
    <section className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
      <h2 className="font-display text-2xl font-semibold text-cream">Inactive pilots</h2>
      <p className="mt-1 text-sm text-cream-dim">
        Active pilots who haven&apos;t filed a PIREP in {THRESHOLD}+ days (or never filed) — oldest first.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-obsidian bg-ink-900">
        <div className="hidden grid-cols-[1.4fr_1fr_0.9fr] gap-4 border-b border-obsidian/70 px-6 py-3 text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint md:grid">
          <span>Pilot</span>
          <span>IF username</span>
          <span className="text-right">Last PIREP</span>
        </div>
        {inactive.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-cream-faint">
            🎉 Every active pilot has filed within the last {THRESHOLD} days.
          </p>
        ) : (
          <ul className="divide-y divide-obsidian/60">
            {inactive.map(({ pilot, lastPirepAt, daysSince }) => (
              <li key={pilot.id} className="grid grid-cols-2 items-center gap-3 px-6 py-3.5 md:grid-cols-[1.4fr_1fr_0.9fr] md:gap-4">
                <div>
                  <p className="font-display text-base font-semibold text-cream">{pilot.callsign}</p>
                  <p className="text-xs text-cream-faint">{pilot.displayName}</p>
                </div>
                <span className="hidden font-mono text-xs text-cream-dim md:block">{pilot.ifUsername ?? "—"}</span>
                <span className="text-right text-sm">
                  {lastPirepAt ? (
                    <>
                      <span className="text-cream-dim">{new Date(lastPirepAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="ml-2 rounded-full bg-amber-500/12 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-500">{daysSince}d</span>
                    </>
                  ) : (
                    <span className="rounded-full bg-rose-500/12 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-500">Never filed</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 text-xs text-cream-faint">{inactive.length} pilot{inactive.length === 1 ? "" : "s"} flagged.</p>
    </section>
  );
}
