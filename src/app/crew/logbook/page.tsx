import Link from "next/link";
import { getPilotDashboard, fmtHours, fmtDateZulu, fmtAp, fmtLc } from "@/lib/portal";
import { computeAp, AP_TABLE, cargoEarningsForMinutes } from "@/lib/career";
import { isSpotlight } from "@/lib/ops";

export const metadata = { title: "Logbook" };
export const dynamic = "force-dynamic";

export default async function LogbookPage() {
  const d = await getPilotDashboard();
  if (!d) return <Empty />;

  const rows = d.filedPireps.map((p) => {
    const isCargo = p.server === "Cargo";
    const isCareer = p.server === "Career";
    const ap = computeAp(p.minutes, {
      spotlight: isSpotlight(`${p.flightNo}`),
      rankMultiplier: d.rankMultiplier,
    });
    const lc = isCargo ? cargoEarningsForMinutes(p.minutes) : 0;
    // Earnings by mode: Career → AP, Cargo → LC, Casual → hours only (no reward).
    const earnings =
      p.status !== "approved"
        ? "—"
        : isCargo
          ? `◈ ${lc.toLocaleString()}`
          : isCareer
            ? `✦ ${ap.net.toLocaleString()}`
            : "Hours only";
    return { p, earnings };
  });
  const approved = d.filedPireps.filter((p) => p.status === "approved").length;
  const pending = d.filedPireps.filter((p) => p.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{d.session.callsign}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Logbook</h1>
        </div>
        <Link href="/crew/file" className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-125">File PIREP</Link>
      </header>

      {/* summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: "Lifetime AP", v: `✦ ${fmtAp(d.apBalance)}` },
          { l: "Lifetime LC", v: `◈ ${fmtLc(d.lcBalance)}` },
          { l: "Flight time", v: fmtHours(d.totalMinutes) },
          { l: "PIREPs filed", v: d.totalPireps.toLocaleString() },
          { l: "Approved / pending", v: `${approved} / ${pending}` },
        ].map((c, i) => (
          <div key={c.l} className="rise rounded-2xl border border-obsidian bg-ink-900 p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-xs uppercase tracking-[0.18em] text-cream-faint">{c.l}</p>
            <p className="mt-2 font-display text-xl font-semibold text-cream">{c.v}</p>
          </div>
        ))}
      </div>

      {/* table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-obsidian bg-ink-900">
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.9fr] gap-4 border-b border-obsidian/70 px-6 py-3 text-xs uppercase tracking-wide text-cream-faint md:grid">
          <span>Route</span><span>Aircraft</span><span>Time</span><span>Earnings</span><span className="text-right">Status</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-cream-faint">No flights filed yet. <Link href="/crew/file" className="text-gold">File your first PIREP →</Link></p>
        ) : (
          <ul className="divide-y divide-obsidian/60">
            {rows.map(({ p, earnings }) => (
              <li key={p.id} className="grid grid-cols-2 items-center gap-3 px-6 py-3.5 transition-colors hover:bg-ink-850 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.9fr] md:gap-4">
                <div>
                  <p className="font-mono text-sm font-medium text-cream">{p.dep} → {p.arr}</p>
                  <p className="text-xs text-cream-faint">{p.flightNo} · {fmtDateZulu(p.filedAt)}{p.server ? ` · ${p.server}` : ""}</p>
                  {p.status !== "pending" && p.reviewer && (
                    <p className="mt-0.5 text-[0.7rem] text-cream-faint">
                      {p.status === "approved" ? "Approved" : "Rejected"} by {p.reviewer}
                      {p.reviewNote ? <> · <span className={p.status === "rejected" ? "text-rose-400" : "text-cream-dim"}>“{p.reviewNote}”</span></> : ""}
                    </p>
                  )}
                </div>
                <span className="hidden text-sm text-cream-dim md:block">{p.aircraft}</span>
                <span className="hidden text-sm text-cream-dim md:block">{fmtHours(p.minutes)}</span>
                <span className={`text-sm md:text-left ${earnings === "Hours only" ? "text-cream-faint" : "font-semibold text-cream"}`}>{earnings}</span>
                <span className="text-right"><StatusPill status={p.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reward reference */}
      <p className="mt-4 text-xs text-cream-faint">
        Strait Points are earned in <span className="text-cream-dim">Career</span> mode only — Short &lt;2h ✦{AP_TABLE.regional.net} · Medium 2–6h ✦{AP_TABLE.continental.net.toLocaleString()} · Long 6–15h ✦{AP_TABLE.longhaul.net.toLocaleString()} · Ultra-long 15h+ ✦{AP_TABLE.ultralong.net.toLocaleString()}. On-time filing adds a flat haul bonus (Medium +50 · Long +100 · Ultra +150); spotlight sectors pay 2×. <span className="text-cream-dim">Cargo</span> flights earn Logistic Coins (◈ LC). <span className="text-cream-dim">Casual</span> flights build rank hours only — no AP or LC.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/12 text-emerald-600",
    pending: "bg-amber-500/12 text-amber-600",
    rejected: "bg-rose-500/12 text-rose-500",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${map[status] ?? "bg-ink-800 text-cream-faint"}`}>{status}</span>;
}

function Empty() {
  return (
    <section className="mx-auto max-w-md px-6 py-32 text-center">
      <h1 className="font-display text-3xl font-semibold text-cream">Sign in to view your logbook</h1>
      <Link href="/api/auth/discord" className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-medium text-white">Sign in</Link>
    </section>
  );
}
