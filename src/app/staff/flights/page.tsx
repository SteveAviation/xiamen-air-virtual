import { ifConfigured, getLiveFlightsForUsers } from "@/lib/infiniteflight";
import { listRoster } from "@/lib/db";

export default async function CrewFlights() {
  if (!ifConfigured) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 text-center lg:px-10">
        <div className="rounded-2xl border border-dashed border-gold/30 bg-ink-900 p-10">
          <p className="eyebrow justify-center">Infinite Flight</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-cream">
            Connect the Infinite Flight API
          </h2>
          <p className="mx-auto mt-4 max-w-md text-cream-dim">
            Add your <span className="font-mono text-gold-soft">IF_API_KEY</span> in
            Vercel to unlock live flight tracking, per-pilot logbooks pulled from
            Infinite Flight, IF grade &amp; stats, and PIREP auto-validation.
          </p>
          <p className="mt-4 text-xs text-cream-faint">
            Pilots set their IFC username on their flight deck so we can match them
            to their real flights.
          </p>
        </div>
      </section>
    );
  }

  // Live tracking: which of our pilots are airborne right now.
  const roster = await listRoster("active");
  const ids = new Set(
    roster.map((r) => r.pilot.ifUserId).filter((x): x is string => !!x),
  );
  const live = await getLiveFlightsForUsers(ids);

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <h2 className="font-display text-2xl font-semibold text-cream">
        Flying now
        <span className="ml-3 text-sm text-cream-faint">{live.length} airborne</span>
      </h2>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-obsidian/50 bg-ink-900">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-obsidian/50 text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">
              <th className="px-5 py-4 font-normal">Callsign</th>
              <th className="px-5 py-4 font-normal">Pilot</th>
              <th className="px-5 py-4 font-normal">Server</th>
              <th className="px-5 py-4 font-normal text-right">Altitude</th>
              <th className="px-5 py-4 font-normal text-right">Speed</th>
            </tr>
          </thead>
          <tbody>
            {live.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-cream-faint">
                  None of your pilots are airborne right now.
                </td>
              </tr>
            )}
            {live.map((f) => (
              <tr key={f.flightId} className="border-b border-obsidian/30 last:border-0">
                <td className="px-5 py-4 font-mono text-gold-soft">{f.callsign}</td>
                <td className="px-5 py-4 text-cream">{f.username ?? "—"}</td>
                <td className="px-5 py-4 text-cream-dim">{f.sessionName}</td>
                <td className="px-5 py-4 text-right text-cream-dim">{Math.round(f.altitude).toLocaleString()} ft</td>
                <td className="px-5 py-4 text-right text-cream-dim">{Math.round(f.speed)} kt</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-cream-faint">
        Per-pilot logbooks and PIREP auto-validation appear once pilots link their
        IFC usernames. (Verify IF API field shapes against your key.)
      </p>
    </section>
  );
}
