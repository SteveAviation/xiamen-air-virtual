"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mult = { code: string; value: number; label: string };

export function MultiplierManager({ initial }: { initial: Mult[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Mult[]>(initial.length ? initial : []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const update = (i: number, k: keyof Mult, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: k === "value" ? v : v } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const add = () => setRows((r) => [...r, { code: "", value: 2, label: "" }]);

  async function save() {
    setError("");
    setMsg("");
    // Normalise value to number before sending.
    const payload = rows.map((r) => ({ code: r.code, value: Number(r.value), label: r.label }));
    if (payload.some((r) => !r.code.trim() || !r.label.trim() || !Number.isFinite(r.value) || r.value <= 0)) {
      setError("Every multiplier needs a code, a label and a value greater than 0.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/crew/multipliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ multipliers: payload }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      if (Array.isArray(j.multipliers)) setRows(j.multipliers);
      setMsg("Saved ✓");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not save multipliers.");
    }
  }

  const input = "rounded-lg border border-obsidian bg-ink-850 px-2.5 py-1.5 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold";

  return (
    <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-cream">Event multipliers</h3>
          <p className="mt-1 text-sm text-cream-dim">Pilots pick a code when filing to boost the reward. Code is what they select; value multiplies the flight time.</p>
        </div>
        <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-sm text-gold">{rows.length}</span>
      </div>

      <div className="mt-5 space-y-2">
        <div className="hidden grid-cols-[1fr_0.6fr_1.6fr_auto] gap-2 px-1 text-[0.65rem] uppercase tracking-[0.15em] text-cream-faint sm:grid">
          <span>Code</span><span>×</span><span>Label (shown to pilots)</span><span></span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_0.6fr_1.6fr_auto] items-center gap-2">
            <input className={`${input} font-mono uppercase`} value={r.code} placeholder="EVENT" onChange={(e) => update(i, "code", e.target.value)} />
            <input className={input} type="number" min={1} step="0.1" value={r.value} onChange={(e) => update(i, "value", e.target.value)} />
            <input className={input} value={r.label} placeholder="Event — 5×" onChange={(e) => update(i, "label", e.target.value)} />
            <button onClick={() => remove(i)} className="rounded-full border border-obsidian px-2.5 py-1.5 text-xs text-cream-faint hover:border-rose/50 hover:text-rose" title="Delete">✕</button>
          </div>
        ))}
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-obsidian px-3 py-6 text-center text-sm text-cream-faint">No multipliers. Add one below.</p>}
      </div>

      {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button onClick={add} className="rounded-full border border-obsidian px-4 py-2 text-sm text-cream-dim transition-colors hover:text-cream">+ Add multiplier</button>
        <button onClick={save} disabled={busy} className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
}
