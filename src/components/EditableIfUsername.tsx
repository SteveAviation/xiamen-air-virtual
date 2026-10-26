"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* Inline staff editor for a pilot's Infinite Flight username, shown in the
   Crew Center roster. Resolves the IF user ID server-side on save. */
export function EditableIfUsername({
  pilotId,
  current,
}: {
  pilotId: number;
  current: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crew/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ifusername", pilotId, ifUsername: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save.");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(current ?? "");
          setEditing(true);
        }}
        title="Set IF username"
        className="group inline-flex items-center gap-1.5 font-mono text-xs text-cream-dim hover:text-gold-soft"
      >
        <span className={current ? "" : "text-cream-faint"}>{current ?? "—"}</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">✎</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="IFC name"
          autoFocus
          className="w-32 rounded-md border border-obsidian/60 bg-ink-850 px-2 py-1 font-mono text-xs text-cream focus:border-gold/60 focus:outline-none"
        />
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-gold px-2 py-1 text-xs text-cream hover:bg-gold-soft disabled:opacity-50"
        >
          {busy ? "…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-1 text-xs text-cream-faint hover:text-cream"
        >
          ✕
        </button>
      </div>
      {error && <p className="text-[0.65rem] text-red-400">{error}</p>}
    </div>
  );
}
