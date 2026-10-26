"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Report } from "@/lib/db";

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const CAT_STYLE: Record<string, string> = {
  bug: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  player: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  staff: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  other: "border-obsidian/60 bg-ink-850 text-cream-dim",
};
const CAT_LABEL: Record<string, string> = {
  bug: "Bug",
  player: "Player",
  staff: "Staff",
  other: "Other",
};

function ReportRow({ report }: { report: Report }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: Report["status"]) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/crew/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-full px-4 py-1.5 text-sm transition-colors disabled:opacity-50";
  const resolved = report.status !== "open";

  return (
    <div className="rounded-2xl border border-obsidian/50 bg-ink-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[0.6rem] uppercase tracking-wider ${CAT_STYLE[report.category]}`}
          >
            {CAT_LABEL[report.category] ?? "Other"}
          </span>
          <span className="text-xs text-cream-faint">#{report.id}</span>
          {report.target && (
            <span className="text-sm text-cream">
              re: <span className="text-gold-soft">{report.target}</span>
            </span>
          )}
          {report.status === "resolved" && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-emerald-300">
              Resolved
            </span>
          )}
          {report.status === "dismissed" && (
            <span className="rounded-full border border-obsidian/60 bg-ink-850 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-cream-faint">
              Dismissed
            </span>
          )}
        </div>
        <p className="text-xs text-cream-faint">{fmt(report.createdAt)}</p>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-cream-dim">{report.message}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-cream-faint">
        <span>From: {report.reporterName || "Anonymous"}</span>
        {resolved && report.resolver && (
          <span>
            {report.status === "resolved" ? "Resolved" : "Dismissed"} by {report.resolver}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {report.status === "open" ? (
          <>
            <button
              onClick={() => setStatus("resolved")}
              disabled={busy}
              className={`${btn} bg-emerald-600/90 text-white hover:bg-emerald-500`}
            >
              Mark resolved
            </button>
            <button
              onClick={() => setStatus("dismissed")}
              disabled={busy}
              className={`${btn} border border-obsidian/60 text-cream-faint hover:text-cream`}
            >
              Dismiss
            </button>
          </>
        ) : (
          <button
            onClick={() => setStatus("open")}
            disabled={busy}
            className={`${btn} border border-gold/40 text-gold-soft hover:bg-gold/10`}
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

export function ReportAdmin({
  open,
  resolved,
}: {
  open: Report[];
  resolved: Report[];
}) {
  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-cream">Reports</h2>
        <p className="mt-1 text-sm text-cream-faint">
          Bug, player, and staff reports submitted from the site.
        </p>
      </header>

      <div className="mb-10">
        <h3 className="eyebrow mb-3">
          Open {open.length > 0 && `· ${open.length}`}
        </h3>
        {open.length === 0 ? (
          <p className="rounded-2xl border border-obsidian/40 bg-ink-900 p-6 text-sm text-cream-faint">
            No open reports.
          </p>
        ) : (
          <div className="grid gap-4">
            {open.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h3 className="eyebrow mb-3">Closed · {resolved.length}</h3>
          <div className="grid gap-4">
            {resolved.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
