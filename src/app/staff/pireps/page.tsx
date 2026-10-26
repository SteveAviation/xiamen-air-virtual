import { listPireps, getPilotById } from "@/lib/db";
import { StaffQueue, type Validation } from "@/components/StaffQueue";
import { ifConfigured, findLogbookFlight } from "@/lib/infiniteflight";

export default async function CrewPireps() {
  const pending = await listPireps("pending");

  // Resolve each pilot once (for names + IF identity).
  const pilotIds = [...new Set(pending.map((p) => p.pilotId))];
  const pilotEntries = await Promise.all(
    pilotIds.map(async (id) => [id, await getPilotById(id)] as const),
  );
  const pilots = Object.fromEntries(pilotEntries);
  const names: Record<number, string> = {};
  for (const [id, p] of pilotEntries) names[id] = p?.callsign ?? `#${id}`;

  // Cross-check each PIREP against the pilot's Infinite Flight logbook.
  const validation: Record<number, Validation> = {};
  await Promise.all(
    pending.map(async (p) => {
      const pilot = pilots[p.pilotId];
      if (!ifConfigured) {
        validation[p.id] = { state: "off" };
      } else if (!pilot?.ifUserId) {
        validation[p.id] = { state: "unlinked" };
      } else {
        const m = await findLogbookFlight(pilot.ifUserId, p.dep, p.arr);
        validation[p.id] = m
          ? {
              state: "match",
              match: {
                totalMinutes: m.totalMinutes,
                landingCount: m.landingCount,
                created: m.created,
                server: m.server,
              },
            }
          : { state: "nomatch" };
      }
    }),
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <h2 className="font-display text-2xl font-semibold text-cream">
        Pending PIREPs
        <span className="ml-3 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 align-middle text-sm text-gold-soft">
          {pending.length}
        </span>
      </h2>
      <p className="mt-2 text-sm text-cream-dim">
        Approving a report credits its hours toward the pilot&apos;s rank. Each
        report is cross-checked against the pilot&apos;s Infinite Flight logbook.
      </p>
      <div className="mt-6">
        <StaffQueue pireps={pending} pilotNames={names} validation={validation} />
      </div>
    </section>
  );
}
