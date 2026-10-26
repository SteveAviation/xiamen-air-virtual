import { leaderboard } from "@/lib/db";
import { rankForHours, estimateApFromHours, tierForAp } from "@/lib/career";
import { fmtHours, fmtApCompact, getPilotDashboard } from "@/lib/portal";

export const metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [rows, me] = await Promise.all([leaderboard(), getPilotDashboard()]);
  const top = rows.slice(0, 30);
  const myId = me?.session.pilotId;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
      <header className="rise">
        <p className="eyebrow">Hall of fame</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Leaderboard</h1>
        <p className="mt-2 text-cream-dim">Ranked by verified flight hours across the network. The number beside each pilot is their <span className="text-cream">standing</span> — #1 has the most hours (top three get medals).</p>
      </header>

      <ol className="mt-7 space-y-2">
        {top.map((r, i) => {
          const hours = r.minutes / 60;
          const rank = rankForHours(hours).current;
          const ap = estimateApFromHours(hours);
          const tier = tierForAp(ap).current;
          const mine = r.pilot.id === myId;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <li key={r.pilot.id} className={`rise flex items-center gap-4 rounded-2xl border px-4 py-3 lift ${mine ? "border-gold bg-gold/5" : "border-obsidian bg-ink-900"}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              <span title={`Leaderboard standing — #${i + 1}`} className="w-8 shrink-0 text-center font-display text-lg font-semibold text-cream-faint">{medal ?? i + 1}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: tier.accent }}>
                {r.pilot.callsign.replace(/[^A-Za-z0-9]/g, "").slice(-2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cream">{r.pilot.callsign}{mine && <span className="ml-2 text-xs text-gold">you</span>}</p>
                <p className="text-xs text-cream-faint">{rank.name} · {r.flights.toLocaleString()} flights</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-cream-faint">Strait Points</p>
                <p className="text-sm font-semibold text-cream">✦ {fmtApCompact(ap)}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-base font-semibold text-cream">{fmtHours(r.minutes)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
