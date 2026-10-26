"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* One-click removal of the fictional seed/placeholder pilots that an earlier
   build inserted (e.g. "XMV 001 · Demo Pilot"). Targets only the exact
   seeded records — real pilots are untouched. */
export function PurgeSeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function purge() {
    if (!window.confirm("Remove all fictional seed/placeholder pilots? Your real pilots are not affected.")) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/crew/pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purgeSeed" }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(`Removed ${j.removed ?? 0} seed pilot${j.removed === 1 ? "" : "s"}.`);
      router.refresh();
    } else {
      setMsg("Could not purge.");
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={purge}
        disabled={busy}
        className="rounded-full border border-obsidian px-3 py-1.5 text-xs text-cream-faint transition-colors hover:border-rose/50 hover:text-rose disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove seed pilots"}
      </button>
      {msg && <span className="text-xs text-emerald-400">{msg}</span>}
    </span>
  );
}
