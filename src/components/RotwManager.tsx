"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Opt = { routeNumber: string; label: string };

export function RotwManager({ current, options }: { current: string; options: Opt[] }) {
  const router = useRouter();
  const [sel, setSel] = useState(current);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/crew/rotw", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeNumber: sel }),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); router.refresh(); }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select value={sel} onChange={(e) => { setSel(e.target.value); setSaved(false); }}
        className="flex-1 rounded-xl border border-obsidian bg-ink-850 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-gold">
        {options.map((o) => <option key={o.routeNumber} value={o.routeNumber}>{o.label}</option>)}
      </select>
      <button onClick={save} disabled={busy || sel === current}
        className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">
        {busy ? "Saving…" : saved ? "Saved ✓" : "Set as Route of the Week"}
      </button>
    </div>
  );
}
