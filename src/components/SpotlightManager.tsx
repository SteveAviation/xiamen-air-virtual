"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { routeNumber: string; label: string };

/* Staff pick up to 3 spotlight routes. They surface on pilot dispatch and pay
   ×2 AP (career) / ×2 LC (cargo) when they appear. Empty = auto-rotate. */
export function SpotlightManager({ options, current }: { options: Opt[]; current: string[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([current[0] ?? "", current[1] ?? "", current[2] ?? ""]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const setAt = (i: number, v: string) => {
    setSel((s) => s.map((x, idx) => (idx === i ? v : x)));
    setSaved(false);
  };

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/crew/spotlight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotlightNos: sel.filter(Boolean) }),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); router.refresh(); }
  }

  async function clear() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/crew/spotlight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotlightNos: null }),
    });
    setBusy(false);
    if (res.ok) { setSel(["", "", ""]); router.refresh(); }
  }

  const select = "w-full rounded-xl border border-obsidian bg-ink-850 px-3 py-2.5 text-sm text-cream outline-none focus:border-gold";

  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <label className="mb-1 block text-[0.65rem] uppercase tracking-[0.15em] text-cream-faint">Spotlight {i + 1}</label>
          <select value={sel[i]} onChange={(e) => setAt(i, e.target.value)} className={select}>
            <option value="">— none —</option>
            {options.map((o) => (
              <option key={o.routeNumber} value={o.routeNumber}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={save} disabled={busy} className="rounded-full bg-rose px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">
          {busy ? "Saving…" : saved ? "Saved ✓" : "Set spotlight routes"}
        </button>
        <button onClick={clear} disabled={busy} className="rounded-full border border-obsidian px-4 py-2.5 text-xs text-cream-faint transition-colors hover:text-cream disabled:opacity-50">
          Reset to auto
        </button>
      </div>
    </div>
  );
}
