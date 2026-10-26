"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Pirep } from "@/lib/db";
import { formatDuration } from "@/lib/rank";
import { computeAp, cargoEarningsForMinutes } from "@/lib/career";

/* Submission date + Zulu time, e.g. "12 Jul · 14:30Z". */
function filedZulu(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${date} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}Z`;
}

/* Potential payout by mode (stored in p.server): Career → AP, Cargo → LC,
   Casual → flight time only (no AP/LC). Mirrors the pilot-side economy so the
   staff view never implies a casual flight earns AP or LC. */
function payoutLabel(p: Pirep): string {
  if (p.server === "Cargo") return `◈ ${cargoEarningsForMinutes(p.minutes).toLocaleString()} LC`;
  if (p.server === "Career") return `✦ ${computeAp(p.minutes).net.toLocaleString()} AP`;
  return "Flight time only";
}

export type Validation = {
  state: "match" | "nomatch" | "unlinked" | "off";
  match?: {
    totalMinutes: number;
    landingCount: number;
    created: string;
    server: string | null;
  };
};

export function StaffQueue({
  pireps,
  pilotNames,
  validation = {},
}: {
  pireps: Pirep[];
  pilotNames: Record<number, string>;
  validation?: Record<number, Validation>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function review(id: number, action: "approve" | "reject") {
    setBusy(id);
    const res = await fetch("/api/staff/pirep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, note: notes[id] ?? "" }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  if (pireps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-obsidian/60 bg-ink-900 p-12 text-center text-cream-faint">
        Nothing pending. The queue is clear ✦
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pireps.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-5 rounded-2xl border border-obsidian/50 bg-ink-900 p-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            <Cell label="Pilot" value={pilotNames[p.pilotId] ?? `#${p.pilotId}`} />
            <Cell label="Flight" value={p.flightNo} mono />
            <Cell label="Route" value={`${p.dep} → ${p.arr}`} />
            <Cell label="Aircraft" value={p.aircraft} />
            <Cell label="Raw time" value={formatDuration(p.rawMinutes)} />
            <Cell
              label="Multiplier"
              value={p.multiplierCode ? `${p.multiplierCode} (${p.multiplier}×)` : "1× (none)"}
            />
            <Cell label="Credited time" value={formatDuration(p.minutes)} highlight />
            <Cell label="Mode" value={p.server ?? "—"} />
            <Cell label="Filed (Zulu)" value={filedZulu(p.filedAt)} />
            <Cell label="Potential payout" value={payoutLabel(p)} highlight />
            <Cell label="Fuel" value={p.fuelKg != null ? `${p.fuelKg.toLocaleString()} kg` : "—"} />
            {p.remarks && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">Remarks</p>
                <p className="mt-1 text-sm text-cream-dim">{p.remarks}</p>
              </div>
            )}
            <div className="col-span-2 sm:col-span-4">
              <LogbookCheck v={validation[p.id]} rawMinutes={p.rawMinutes} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 lg:w-56">
            <input
              value={notes[p.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
              placeholder="Note to pilot (optional)…"
              className="w-full rounded-lg border border-obsidian bg-ink-850 px-3 py-2 text-xs text-cream placeholder:text-cream-faint outline-none focus:border-gold"
            />
            <div className="flex gap-3">
              <button
                onClick={() => review(p.id, "approve")}
                disabled={busy === p.id}
                className="flex-1 rounded-full bg-emerald-600/90 px-5 py-2.5 text-sm font-normal text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => review(p.id, "reject")}
                disabled={busy === p.id}
                className="flex-1 rounded-full border border-red-500/40 px-5 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogbookCheck({ v, rawMinutes }: { v?: Validation; rawMinutes: number }) {
  if (!v || v.state === "off") return null;

  if (v.state === "unlinked") {
    return (
      <div className="rounded-lg border border-obsidian/60 bg-ink-850 px-3 py-2 text-xs text-cream-faint">
        IF logbook — pilot hasn&apos;t linked their IFC username yet.
      </div>
    );
  }
  if (v.state === "nomatch") {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
        ⚠ No matching flight for this route in the pilot&apos;s IF logbook.
      </div>
    );
  }

  const m = v.match!;
  const diff = Math.abs(m.totalMinutes - rawMinutes);
  const consistent = diff <= Math.max(15, rawMinutes * 0.12);
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs ${
        consistent
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
      }`}
    >
      {consistent ? "✓" : "⚠"} IF logbook: {formatDuration(m.totalMinutes)} ·{" "}
      {m.landingCount} ldg · {m.server ?? "—"} · {m.created.slice(0, 10)}
      <span className="text-cream-faint">
        {" "}
        — filed raw {formatDuration(rawMinutes)}
        {consistent ? " (consistent)" : ` (differs by ${formatDuration(diff)})`}
      </span>
    </div>
  );
}

function Cell({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">{label}</p>
      <p
        className={`mt-1 text-sm ${
          highlight
            ? "font-semibold text-gold-soft"
            : mono
              ? "font-mono text-gold-soft"
              : "text-cream"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
