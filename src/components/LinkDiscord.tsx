"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LinkDiscord({
  pilotId,
  linked,
}: {
  pilotId: number;
  linked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (linked && !open) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Linked
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-gold/40 px-3 py-1.5 text-xs text-gold-soft transition-colors hover:bg-gold/10"
      >
        Link Discord
      </button>
    );
  }

  async function link() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/crew/pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilotId, action: "link", discordId: value.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Couldn't link.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Discord user ID"
          className="w-36 rounded-full border border-obsidian/60 bg-ink-850 px-3 py-1.5 text-xs text-cream placeholder:text-cream-faint outline-none focus:border-gold-soft"
        />
        <button
          onClick={link}
          disabled={busy}
          className="rounded-full bg-gold px-3 py-1.5 text-xs font-normal text-cream hover:bg-gold-soft disabled:opacity-60"
        >
          {busy ? "…" : "Save"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          className="rounded-full px-2 py-1.5 text-xs text-cream-faint hover:text-cream-dim"
        >
          ✕
        </button>
      </div>
      {error && <span className="text-[0.65rem] text-red-300">{error}</span>}
    </div>
  );
}
