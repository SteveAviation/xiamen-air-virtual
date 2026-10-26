"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RANKS, ACRUX_RANK } from "@/lib/data";

const OPTIONS = [...RANKS.map((r) => r.name), ACRUX_RANK.name];

export function SetRank({
  pilotId,
  rankLabel,
  derived,
}: {
  pilotId: number;
  rankLabel: string | null;
  derived: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // "" = auto (derived from hours)
  const value = rankLabel ?? "";

  async function change(rankName: string) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/crew/pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilotId, action: "rank", rankName }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      if (j.discordSync && j.discordSync.configured === false) {
        setNote("saved (Discord role sync not configured)");
      } else if (j.discordSync?.ok === false) {
        setNote(`saved · Discord: ${j.discordSync.reason ?? "not updated"}`);
      } else if (j.discordSync?.ok) {
        setNote("saved · Discord role updated");
      } else {
        setNote("saved");
      }
      router.refresh();
    } else {
      setNote(j.error || "failed");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-obsidian/60 bg-ink-850 px-2.5 py-1.5 text-sm text-cream outline-none focus:border-gold-soft disabled:opacity-60"
      >
        <option value="">Auto · {derived}</option>
        {OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {note && <span className="text-[0.6rem] text-cream-faint">{note}</span>}
    </div>
  );
}
