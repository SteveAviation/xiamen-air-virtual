import { listRoster } from "@/lib/db";
import { RANK_NAMES } from "@/lib/data";
import { rankFromMinutes, formatDuration } from "@/lib/rank";
import { fmtApCompact, fmtLcCompact, getPilotEconomy } from "@/lib/portal";
import { CrewPilotActions } from "@/components/CrewPilotActions";
import { LinkDiscord } from "@/components/LinkDiscord";
import { SetRank } from "@/components/SetRank";
import { AddMemberForm } from "@/components/AddMemberForm";
import { EditableIfUsername } from "@/components/EditableIfUsername";
import { EditPilot } from "@/components/EditPilot";
import { PurgeSeedButton } from "@/components/PurgeSeedButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  pending: "border-gold/40 bg-gold/10 text-gold-soft",
  suspended: "border-red-500/40 bg-red-500/10 text-red-300",
};

export default async function CrewPilots() {
  const roster = await listRoster();
  // Mode-correct wallet per pilot (career-only AP, cargo-only LC, minus spend) —
  // so a casual-only flyer shows 0, not hours-estimated AP.
  const econById = Object.fromEntries(
    await Promise.all(roster.map(async ({ pilot }) => [pilot.id, await getPilotEconomy(pilot.id)] as const)),
  );

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-cream">
          Roster
          <span className="ml-3 text-sm text-cream-faint">{roster.length} pilots</span>
        </h2>
        <PurgeSeedButton />
      </div>

      <AddMemberForm rankNames={RANK_NAMES} />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-obsidian/50 bg-ink-900">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-obsidian/50 text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">
              <th className="px-5 py-4 font-normal">Pilot</th>
              <th className="px-5 py-4 font-normal">IF username</th>
              <th className="px-5 py-4 font-normal">Rank</th>
              <th className="px-5 py-4 font-normal text-right">Hours</th>
              <th className="px-5 py-4 font-normal text-right">Flights</th>
              <th className="px-5 py-4 font-normal">AP · LC · Licence</th>
              <th className="px-5 py-4 font-normal">Status</th>
              <th className="px-5 py-4 font-normal">Discord</th>
              <th className="px-5 py-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roster.map(({ pilot, minutes, approved }) => {
              const derived = rankFromMinutes(minutes).current.name;
              const econ = econById[pilot.id];
              const ap = econ?.apBalance ?? 0;
              const lc = econ?.lcBalance ?? 0;
              const lic = econ?.license.current.short ?? "None";
              const tier = econ?.tier.current;
              return (
                <tr key={pilot.id} className="border-b border-obsidian/30 last:border-0 hover:bg-ink-850">
                  <td className="px-5 py-4">
                    <span className="font-normal text-cream">{pilot.callsign}</span>
                    {pilot.isStaff && (
                      <span className="ml-2 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-gold-soft">
                        Admin
                      </span>
                    )}
                    {(pilot.warnings?.length ?? 0) > 0 && (
                      <span
                        title={pilot.warnings!.map((w) => `⚠ ${w.reason}`).join("\n")}
                        className="ml-2 rounded-full border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[0.65rem] text-red-300"
                      >
                        ⚠ {pilot.warnings!.length}
                      </span>
                    )}
                    <span className="ml-2 text-cream-faint">{pilot.displayName}</span>
                  </td>
                  <td className="px-5 py-4">
                    <EditableIfUsername pilotId={pilot.id} current={pilot.ifUsername} />
                  </td>
                  <td className="px-5 py-4">
                    <SetRank pilotId={pilot.id} rankLabel={pilot.rankLabel} derived={derived} />
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-cream-dim">
                    {formatDuration(minutes)}
                  </td>
                  <td className="px-5 py-4 text-right text-cream-dim">{approved}</td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-cream">✦ {fmtApCompact(ap)}</span>
                    <span className="ml-2 text-cream-dim">◈ {fmtLcCompact(lc)}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-cream-faint">
                      {tier && <span className="h-2 w-2 rounded-full" style={{ background: tier.accent }} />}
                      {lic}{tier ? ` · ${tier.name}` : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider ${STATUS_STYLE[pilot.status]}`}>
                      {pilot.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <LinkDiscord pilotId={pilot.id} linked={pilot.linked} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <CrewPilotActions
                        pilotId={pilot.id}
                        actions={
                          pilot.status === "active"
                            ? ["suspend"]
                            : pilot.status === "suspended"
                              ? ["reactivate"]
                              : ["accept", "reject"]
                        }
                      />
                      <EditPilot pilot={pilot} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-cream-faint">
        Ranks are derived automatically from approved flight hours.
      </p>
    </section>
  );
}
