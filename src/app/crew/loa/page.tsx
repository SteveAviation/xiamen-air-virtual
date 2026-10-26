import { getSession } from "@/lib/auth";
import { getCurrentLoa, LOA_MAX_DAYS } from "@/lib/db";
import { fmtDate } from "@/lib/portal";
import { LoaForm } from "@/components/portal/LoaForm";

export const metadata = { title: "Leave of Absence" };
export const dynamic = "force-dynamic";

export default async function LoaPage() {
  const session = await getSession();
  const loa = session ? await getCurrentLoa(session.pilotId).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 lg:px-8">
      <header className="rise">
        <p className="eyebrow">Crew admin</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Leave of Absence</h1>
        <p className="mt-2 text-cream-dim">Taking a break? File an LOA so your activity requirement is paused while you’re away.</p>
      </header>

      {loa && (loa.status === "active" || loa.status === "pending") ? (
        <div className="mt-7 rounded-2xl border border-gold/40 bg-gold/5 p-6">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{loa.status}</span>
            <span className="text-sm text-cream-faint">{loa.days} days</span>
          </div>
          <p className="mt-3 text-sm text-cream-dim">{loa.reason}</p>
          {loa.endAt && <p className="mt-2 text-xs text-cream-faint">Returns {fmtDate(loa.endAt)}</p>}
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-obsidian bg-ink-900 p-6">
          <LoaForm maxDays={LOA_MAX_DAYS} />
        </div>
      )}
      <p className="mt-4 text-xs text-cream-faint">Maximum {LOA_MAX_DAYS} days. Extensions can be requested in the final week of an active LOA.</p>
    </div>
  );
}
