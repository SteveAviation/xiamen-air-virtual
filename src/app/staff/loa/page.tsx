import { listLoas, getPilotById, type Loa } from "@/lib/db";
import { LoaCard } from "@/components/LoaCard";

export const dynamic = "force-dynamic";

async function withCallsigns(loas: Loa[]): Promise<{ loa: Loa; callsign: string }[]> {
  return Promise.all(
    loas.map(async (loa) => {
      const pilot = await getPilotById(loa.pilotId);
      return { loa, callsign: pilot?.callsign ?? `Pilot #${loa.pilotId}` };
    }),
  );
}

export default async function CrewLoa() {
  const [pendingRaw, activeRaw] = await Promise.all([
    listLoas("pending"),
    listLoas("active"),
  ]);
  const pending = await withCallsigns(pendingRaw);
  const active = await withCallsigns(activeRaw);

  // Surface active LOAs with a pending extension request first.
  active.sort((a, b) => {
    const ap = a.loa.extStatus === "pending" ? 0 : 1;
    const bp = b.loa.extStatus === "pending" ? 0 : 1;
    return ap - bp;
  });

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-cream">
          Leave of Absence
        </h2>
        <p className="mt-1 text-sm text-cream-faint">
          Approve requests, manage active leaves, and grant extensions (max 2 weeks).
        </p>
      </header>

      <div className="mb-10">
        <h3 className="eyebrow mb-3">
          Pending requests {pending.length > 0 && `· ${pending.length}`}
        </h3>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-obsidian/40 bg-ink-900 p-6 text-sm text-cream-faint">
            No pending LOA requests.
          </p>
        ) : (
          <div className="grid gap-4">
            {pending.map(({ loa, callsign }) => (
              <LoaCard key={loa.id} loa={loa} callsign={callsign} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="eyebrow mb-3">
          Active leaves {active.length > 0 && `· ${active.length}`}
        </h3>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-obsidian/40 bg-ink-900 p-6 text-sm text-cream-faint">
            No pilots are currently on leave.
          </p>
        ) : (
          <div className="grid gap-4">
            {active.map(({ loa, callsign }) => (
              <LoaCard key={loa.id} loa={loa} callsign={callsign} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
