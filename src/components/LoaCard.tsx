"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Loa } from "@/lib/db";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}
function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const STATUS_STYLE: Record<string, string> = {
  pending: "border-gold/40 bg-gold/10 text-gold-soft",
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/40 bg-red-500/10 text-red-300",
  ended: "border-obsidian/60 bg-ink-850 text-cream-faint",
};

export function LoaCard({ loa, callsign }: { loa: Loa; callsign: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [extDays, setExtDays] = useState("");

  async function run(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/crew/loa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loa.id, ...body }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const left = daysLeft(loa.endAt);
  const btn =
    "rounded-full px-4 py-1.5 text-sm transition-colors disabled:opacity-50";

  return (
    <div className="rounded-2xl border border-obsidian/50 bg-ink-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-semibold text-cream">{callsign}</h3>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[0.6rem] uppercase tracking-wider ${STATUS_STYLE[loa.status]}`}
            >
              {loa.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-cream-dim">{loa.reason}</p>
        </div>
        <div className="text-right text-xs text-cream-faint">
          <p>{loa.days} day{loa.days === 1 ? "" : "s"}</p>
          {loa.status === "active" && (
            <p className="mt-0.5">
              {fmt(loa.startAt)} → {fmt(loa.endAt)}
              {left != null && (
                <span className="ml-1 text-gold-soft">
                  ({left <= 0 ? "ending" : `${left}d left`})
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Pending extension request */}
      {loa.status === "active" && loa.extStatus === "pending" && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm">
          <p className="text-gold-soft">
            Extension requested: +{loa.extDays} day{loa.extDays === 1 ? "" : "s"}
          </p>
          {loa.extReason && <p className="mt-1 text-cream-dim">{loa.extReason}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => run({ action: "approveExt" })}
              disabled={busy}
              className={`${btn} bg-emerald-600/90 text-white hover:bg-emerald-500`}
            >
              Approve extension
            </button>
            <button
              onClick={() => run({ action: "rejectExt" })}
              disabled={busy}
              className={`${btn} border border-red-500/40 text-red-300 hover:bg-red-500/10`}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {loa.status === "pending" && (
          <>
            <button
              onClick={() => run({ action: "accept" })}
              disabled={busy}
              className={`${btn} bg-emerald-600/90 text-white hover:bg-emerald-500`}
            >
              Accept
            </button>
            <button
              onClick={() => run({ action: "reject" })}
              disabled={busy}
              className={`${btn} border border-red-500/40 text-red-300 hover:bg-red-500/10`}
            >
              Reject
            </button>
          </>
        )}

        {loa.status === "active" && (
          <>
            <input
              type="number"
              min={1}
              max={14}
              value={extDays}
              onChange={(e) => setExtDays(e.target.value)}
              placeholder="+days"
              className="w-20 rounded-full border border-obsidian/60 bg-ink-850 px-3 py-1.5 text-sm text-cream placeholder:text-cream-faint focus:border-gold/60 focus:outline-none"
            />
            <button
              onClick={() => {
                const d = Number(extDays);
                if (d >= 1) run({ action: "manualExt", days: d }).then(() => setExtDays(""));
              }}
              disabled={busy || !extDays}
              className={`${btn} border border-gold/40 text-gold-soft hover:bg-gold/10`}
            >
              Grant extension
            </button>
            <button
              onClick={() => run({ action: "end" })}
              disabled={busy}
              className={`${btn} border border-obsidian/60 text-cream-faint hover:text-cream`}
            >
              End leave
            </button>
          </>
        )}
      </div>
    </div>
  );
}
