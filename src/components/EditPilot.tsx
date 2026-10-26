"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Pilot } from "@/lib/db";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/crew/pilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function EditPilot({ pilot }: { pilot: Pilot }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [callsign, setCallsign] = useState(pilot.callsign);
  const [displayName, setDisplayName] = useState(pilot.displayName);
  const [hours, setHours] = useState(String(Math.floor(pilot.baseMinutes / 60)));
  const [minutes, setMinutes] = useState(String(pilot.baseMinutes % 60));
  const [pireps, setPireps] = useState(String(pilot.basePireps));
  const [warnReason, setWarnReason] = useState("");
  const [passcode, setPasscode] = useState("");
  const [ifc, setIfc] = useState(pilot.ifUsername ?? "");

  const warnings = pilot.warnings ?? [];

  async function run(body: Record<string, unknown>, okText?: string) {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const { ok, data } = await post({ pilotId: pilot.id, ...body });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Something went wrong.");
      return false;
    }
    if (okText) setOkMsg(okText);
    router.refresh();
    return true;
  }

  const inputCls =
    "w-full rounded-xl border border-obsidian/60 bg-ink-850 px-4 py-2.5 text-sm text-cream placeholder:text-cream-faint focus:border-gold/60 focus:outline-none";
  const labelCls = "mb-1.5 block text-xs uppercase tracking-wide text-cream-faint";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-obsidian/60 px-4 py-2 text-sm text-cream-dim transition-colors hover:border-gold/50 hover:text-cream"
      >
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-8 w-full max-w-lg rounded-2xl border border-obsidian/60 bg-ink-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold text-cream">
                  Edit pilot
                </h3>
                <p className="mt-0.5 text-sm text-cream-faint">
                  {pilot.callsign} · {pilot.linked ? "linked" : "unlinked"} · {pilot.status}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-cream-faint hover:text-cream"
              >
                Close
              </button>
            </div>

            {/* Profile */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Callsign</label>
                <input value={callsign} onChange={(e) => setCallsign(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Display name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Carried-over hours</label>
                <input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>…minutes</label>
                <input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Carried-over PIREPs</label>
                <input type="number" min={0} value={pireps} onChange={(e) => setPireps(e.target.value)} className={inputCls} />
              </div>
              <p className="sm:col-span-2 -mt-1 text-[0.7rem] text-cream-faint">
                These are the pilot&apos;s <span className="text-cream-dim">historical carry-over</span> totals. Live totals = carry-over <span className="text-cream-dim">+ filed flights</span>. To reset a pilot who filed on the site, set these to 0 (and reject/remove unwanted PIREPs).
              </p>
            </div>

            <button
              onClick={() =>
                run(
                  {
                    action: "update",
                    callsign,
                    displayName,
                    baseMinutes: (Number(hours) || 0) * 60 + (Number(minutes) || 0),
                    basePireps: Number(pireps) || 0,
                  },
                  "Saved.",
                )
              }
              disabled={busy}
              className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>

            {/* IFC link */}
            <div className="mt-7 border-t border-obsidian/40 pt-5">
              <label className={labelCls}>
                Infinite Flight username{" "}
                {pilot.ifUsername && <span className="text-emerald-300">· linked</span>}
              </label>
              <p className="mb-2 text-xs text-cream-faint">
                Links their IFC account — powers live flights, logbook validation and the
                PIREP autofill. Verified against Infinite Flight on save.
              </p>
              <div className="flex gap-2">
                <input
                  value={ifc}
                  onChange={(e) => setIfc(e.target.value)}
                  placeholder="Their IFC username"
                  className={inputCls}
                />
                <button
                  onClick={() => run({ action: "ifusername", ifUsername: ifc }, "IFC linked.")}
                  disabled={busy}
                  className="shrink-0 rounded-full bg-gold px-4 py-2.5 text-sm text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
                >
                  {pilot.ifUsername ? "Update" : "Link"}
                </button>
              </div>
            </div>

            {/* Warnings */}
            <div className="mt-7 border-t border-obsidian/40 pt-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-cream">
                  Warnings
                  {warnings.length > 0 && (
                    <span className="ml-2 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                      {warnings.length}
                    </span>
                  )}
                </h4>
                {warnings.length > 0 && (
                  <button
                    onClick={() => run({ action: "clearWarnings" }, "Warnings cleared.")}
                    disabled={busy}
                    className="text-xs text-cream-faint hover:text-cream"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {warnings.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {warnings.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-cream-dim"
                    >
                      <span className="text-red-400">⚠</span>
                      <span className="flex-1">{w.reason}</span>
                      <span className="shrink-0 text-xs text-cream-faint">{fmtDate(w.at)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  placeholder="Reason for warning…"
                  className={inputCls}
                />
                <button
                  onClick={async () => {
                    if (warnReason.trim().length < 2) return;
                    const ok = await run({ action: "warn", reason: warnReason }, "Warning added.");
                    if (ok) setWarnReason("");
                  }}
                  disabled={busy}
                  className="shrink-0 rounded-full border border-red-500/40 px-4 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  Add strike
                </button>
              </div>
            </div>

            {/* Access / admin */}
            <div className="mt-7 border-t border-obsidian/40 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-cream">
                    Admin access
                    {pilot.isStaff && (
                      <span className="ml-2 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-gold-soft">
                        Admin
                      </span>
                    )}
                  </h4>
                  <p className="mt-1 text-xs text-cream-faint">
                    {pilot.isStaff
                      ? "Can open the Crew Center and manage the airline."
                      : "Grant Crew Center access. They sign in with their IFC username + passcode below."}
                  </p>
                </div>
                <button
                  onClick={() =>
                    run(
                      { action: "staff", isStaff: !pilot.isStaff },
                      pilot.isStaff ? "Admin revoked." : "Admin granted.",
                    )
                  }
                  disabled={busy}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors disabled:opacity-40 ${
                    pilot.isStaff
                      ? "border border-obsidian/60 text-cream-dim hover:border-red-400/50 hover:text-red-300"
                      : "bg-gold text-cream hover:bg-gold-soft"
                  }`}
                >
                  {pilot.isStaff ? "Revoke admin" : "Make admin"}
                </button>
              </div>

              {/* Passcode (IFC login) */}
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-cream-faint">
                  Login passcode ·{" "}
                  <span className={pilot.hasPasscode ? "text-emerald-300" : "text-cream-faint"}>
                    {pilot.hasPasscode ? "set" : "not set"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-cream-faint">
                  They sign in at <span className="font-mono">/login</span> with their IFC
                  username + this passcode. Leave blank and they set it themselves on first
                  login.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="New passcode (min 4 chars)"
                    className={inputCls}
                  />
                  <button
                    onClick={async () => {
                      if (passcode.length < 4) return;
                      const ok = await run({ action: "setpasscode", passcode }, "Passcode set.");
                      if (ok) setPasscode("");
                    }}
                    disabled={busy || passcode.length < 4}
                    className="shrink-0 rounded-full bg-gold px-4 py-2 text-sm text-cream transition-colors hover:bg-gold-soft disabled:opacity-40"
                  >
                    Set
                  </button>
                  {pilot.hasPasscode && (
                    <button
                      onClick={() => {
                        if (confirm(`Clear ${pilot.callsign}'s passcode? They'll set a new one on next login.`))
                          run({ action: "setpasscode", passcode: "" }, "Passcode cleared.");
                      }}
                      disabled={busy}
                      className="shrink-0 rounded-full border border-obsidian/60 px-4 py-2 text-sm text-cream-faint transition-colors hover:text-cream disabled:opacity-40"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="mt-7 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <h4 className="text-sm font-medium text-red-300">Danger zone</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {pilot.linked && (
                  <button
                    onClick={() => {
                      if (confirm(`Unlink ${pilot.callsign}'s Discord account? They keep their hours and become an unlinked roster member.`))
                        run({ action: "unlink" }, "Discord unlinked.");
                    }}
                    disabled={busy}
                    className="rounded-full border border-obsidian/60 px-4 py-2 text-sm text-cream-dim transition-colors hover:border-gold/50 hover:text-cream disabled:opacity-50"
                  >
                    Unlink Discord
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete ALL of ${pilot.callsign}'s filed PIREPs? This resets their filed flight hours & PIREP count to zero (carried-over totals above are separate). Cannot be undone.`))
                      run({ action: "resetPireps" }, "Filed PIREPs deleted.");
                  }}
                  disabled={busy}
                  className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  Reset filed flights
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Permanently remove ${pilot.callsign} from the Crew Center? This deletes the pilot and all their PIREPs and cannot be undone.`)) {
                      run({ action: "delete" }).then((ok) => {
                        if (ok) setOpen(false);
                      });
                    }
                  }}
                  disabled={busy}
                  className="rounded-full bg-red-600/90 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                >
                  Remove pilot
                </button>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            {okMsg && <p className="mt-4 text-sm text-emerald-300">{okMsg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
