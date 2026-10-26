"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoaForm({ maxDays }: { maxDays: number }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const n = Number(days);
    if (!reason.trim()) return setError("Please give a reason.");
    if (!n || n < 1 || n > maxDays) return setError(`Days must be between 1 and ${maxDays}.`);
    setBusy(true);
    const res = await fetch("/api/pilot/loa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", reason, days: n }),
    });
    setBusy(false);
    if (res.ok) { setOk(true); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); setError(j.error || "Could not submit LOA."); }
  }

  const input = "w-full rounded-xl border border-obsidian bg-ink-850 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold";

  if (ok) return <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">LOA request submitted — staff will review it shortly.</p>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream-faint">Reason</label>
        <textarea className={`${input} min-h-[90px]`} placeholder="Exams, travel, a break from the skies…" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream-faint">Length (days, max {maxDays})</label>
        <input className={input} type="number" min={1} max={maxDays} placeholder="14" value={days} onChange={(e) => setDays(e.target.value)} />
      </div>
      {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-60">{busy ? "Submitting…" : "Request LOA"}</button>
    </form>
  );
}
