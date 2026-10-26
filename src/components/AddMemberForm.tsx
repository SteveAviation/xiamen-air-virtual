"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BulkResult = { added: number; errors: { callsign: string; error: string }[] };

export function AddMemberForm({ rankNames }: { rankNames: readonly string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [callsign, setCallsign] = useState("");
  const [ifUsername, setIfUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rankName, setRankName] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pireps, setPireps] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function reset() {
    setCallsign("");
    setIfUsername("");
    setDisplayName("");
    setRankName("");
    setHours("");
    setMinutes("");
    setPireps("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const baseMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    try {
      const res = await fetch("/api/crew/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          callsign,
          ifUsername,
          displayName,
          rankName,
          baseMinutes,
          basePireps: Number(pireps) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add member.");
      } else {
        setOkMsg(`Added ${data.pilot?.callsign ?? callsign}.`);
        reset();
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setBulkResult(null);
    // Parse: one member per line, "callsign, ifUsername" (comma or tab; IF optional).
    const rows = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t]/).map((s) => s.trim());
        return { callsign: parts[0] ?? "", ifUsername: parts[1] ?? "" };
      })
      .filter((r) => r.callsign);
    if (rows.length === 0) {
      setError("Paste at least one member.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/crew/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkCreate", rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bulk add failed.");
      } else {
        setBulkResult({ added: data.added ?? 0, errors: data.errors ?? [] });
        if (!data.errors?.length) setBulkText("");
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-obsidian/60 bg-ink-850 px-4 py-2.5 text-sm text-cream placeholder:text-cream-faint focus:border-gold/60 focus:outline-none";
  const labelCls =
    "mb-1.5 block text-xs uppercase tracking-wide text-cream-faint";
  const tab = (m: "single" | "bulk", label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError(null);
      }}
      className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
        mode === m
          ? "bg-gold/20 text-gold-soft"
          : "text-cream-faint hover:text-cream-dim"
      }`}
    >
      {label}
    </button>
  );

  if (!open) {
    return (
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-gold px-5 py-2.5 text-sm text-cream transition-colors hover:bg-gold-soft"
        >
          + Add member
        </button>
        {okMsg && <span className="text-sm text-emerald-300">{okMsg}</span>}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-gold/30 bg-ink-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold text-cream">
          Add members
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-cream-faint hover:text-cream"
        >
          Close
        </button>
      </div>

      <div className="mt-3 flex gap-1">
        {tab("single", "One at a time")}
        {tab("bulk", "Paste a list")}
      </div>

      {mode === "bulk" ? (
        <form onSubmit={submitBulk} className="mt-5">
          <label className={labelCls}>
            One member per line — <span className="normal-case">callsign, IF username</span>
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              setBulkResult(null);
            }}
            rows={9}
            placeholder={"Xiamen Air 001, theirIFCname\nXiamen Air 004, anotherIFCname\nXiamen Air 042"}
            className={`${inputCls} resize-y font-mono`}
          />
          <p className="mt-2 text-xs text-cream-faint">
            The IF username is optional (leave it off to add by callsign only).
            Re-pasting an existing callsign updates it — safe to run again.
          </p>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {bulkResult && (
            <div className="mt-4 rounded-xl border border-obsidian/50 bg-ink-850 p-4 text-sm">
              <p className="text-emerald-300">
                Added / updated {bulkResult.added} member
                {bulkResult.added === 1 ? "" : "s"}.
              </p>
              {bulkResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-cream-faint">
                    {bulkResult.errors.length} skipped:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-300">
                    {bulkResult.errors.map((er, i) => (
                      <li key={i}>
                        <span className="font-mono">{er.callsign}</span> — {er.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 rounded-full bg-gold px-6 py-2.5 text-sm text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add all"}
          </button>
        </form>
      ) : (
        <form onSubmit={submit}>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Callsign *</label>
          <input
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            placeholder="e.g. Xiamen Air 042"
            className={inputCls}
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>IF username</label>
          <input
            value={ifUsername}
            onChange={(e) => setIfUsername(e.target.value)}
            placeholder="Infinite Flight Community name"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Display name <span className="text-cream-faint/70">(optional)</span>
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Defaults to the callsign"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Rank <span className="text-cream-faint/70">(optional)</span>
          </label>
          <select
            value={rankName}
            onChange={(e) => setRankName(e.target.value)}
            className={inputCls}
          >
            <option value="">Auto (from hours)</option>
            {rankNames.map((r) => (
              <option key={r} value={r} className="bg-ink-850">
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Carried-over hours</label>
          <input
            type="number"
            min={0}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>…minutes</label>
          <input
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Carried-over PIREPs</label>
          <input
            type="number"
            min={0}
            value={pireps}
            onChange={(e) => setPireps(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-gold px-6 py-2.5 text-sm text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add member"}
        </button>
        <p className="text-xs text-cream-faint">
          Added as an active, unlinked member. They link a Discord account later
          to sign in. Re-adding an existing callsign updates it.
        </p>
      </div>
        </form>
      )}
    </div>
  );
}
