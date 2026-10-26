"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeAp, categoryForMinutes, AP_TABLE, cargoEarningsForMinutes, punctualityForMinutes } from "@/lib/career";

type Group = { group: string; items: string[] };
type Mult = { code: string; value: number; label: string };

export type PirepPrefill = {
  flightNo?: string;
  dep?: string;
  arr?: string;
  aircraft?: string;
  type?: string; // Casual | Career | Cargo
  expired?: boolean; // accepted-flight window expired → no punctuality
};

const FLIGHT_TYPES = ["Casual", "Career", "Cargo"];

export function FilePirep({
  groups,
  multipliers,
  punctualBonus = 0,
  prefill,
}: {
  groups: Group[];
  multipliers: Mult[];
  punctualBonus?: number;
  prefill?: PirepPrefill;
}) {
  const router = useRouter();
  const lockPunctual = !!prefill?.expired;
  const [f, setF] = useState({
    flightNo: prefill?.flightNo ?? "",
    dep: prefill?.dep ?? "",
    arr: prefill?.arr ?? "",
    aircraft: prefill?.aircraft ?? "",
    hours: "", minutes: "",
    flightType: prefill?.type && FLIGHT_TYPES.includes(prefill.type) ? prefill.type : "Casual",
    fuelKg: "", multiplier: "", remarks: "",
    punctual: !lockPunctual,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const isCasual = f.flightType === "Casual";
  const isCargo = f.flightType === "Cargo";
  const rawMin = (Number(f.hours) || 0) * 60 + (Number(f.minutes) || 0);
  // Punctuality only applies to rewarded modes (Career AP / Cargo LC) and is
  // haul-based: short +0 · medium +50 · long +100 · ultra +150.
  const punctual = !isCasual && f.punctual;
  const punctBonus = rawMin > 0 && !isCasual ? punctualityForMinutes(rawMin) : 0;
  const ap = useMemo(() => {
    if (rawMin <= 0 || isCasual || isCargo) return null;
    return computeAp(rawMin, { punctual });
  }, [rawMin, isCasual, isCargo, punctual]);
  const lc = rawMin > 0 && isCargo ? cargoEarningsForMinutes(rawMin) : null;
  const cat = rawMin > 0 ? categoryForMinutes(rawMin) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.flightNo || f.dep.length < 3 || f.arr.length < 3) return setError("Flight number and valid ICAO airports are required.");
    if (!f.aircraft) return setError("Select an aircraft.");
    if (rawMin <= 0) return setError("Flight time must be greater than zero.");
    setBusy(true);
    const res = await fetch("/api/pirep", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, flightType: f.flightType }),
    });
    setBusy(false);
    if (res.ok) { router.push("/crew/logbook"); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); setError(j.error || "Could not file PIREP."); }
  }

  const input = "w-full rounded-xl border border-obsidian bg-ink-850 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-faint outline-none transition-colors focus:border-gold";
  const label = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream-faint";
  const autofilled = !!prefill?.flightNo;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* form */}
      <div className="space-y-5 rounded-2xl border border-obsidian bg-ink-900 p-6">
        {autofilled && (
          <p className="rounded-xl border border-gold/30 bg-gold/[0.05] px-3.5 py-2.5 text-xs text-cream-dim">
            ✓ Pre-filled from your dispatch — just add flight time, fuel and any event code.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className={label}>Flight no.</label><input className={`${input} uppercase font-mono`} placeholder="AY15" value={f.flightNo} onChange={(e) => set("flightNo", e.target.value)} /></div>
          <div><label className={label}>From (ICAO)</label><input className={`${input} uppercase font-mono`} placeholder="ZSAM" maxLength={4} value={f.dep} onChange={(e) => set("dep", e.target.value)} /></div>
          <div><label className={label}>To (ICAO)</label><input className={`${input} uppercase font-mono`} placeholder="KJFK" maxLength={4} value={f.arr} onChange={(e) => set("arr", e.target.value)} /></div>
        </div>
        <div><label className={label}>Aircraft</label>
          <select className={input} value={f.aircraft} onChange={(e) => set("aircraft", e.target.value)}>
            <option value="">Select aircraft…</option>
            {groups.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((it) => <option key={it} value={it}>{it}</option>)}</optgroup>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className={label}>Hours</label><input className={input} type="number" min={0} placeholder="9" value={f.hours} onChange={(e) => set("hours", e.target.value)} /></div>
          <div><label className={label}>Minutes</label><input className={input} type="number" min={0} max={59} placeholder="05" value={f.minutes} onChange={(e) => set("minutes", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={label}>Flight type</label>
            <select className={input} value={f.flightType} onChange={(e) => set("flightType", e.target.value)}>
              {FLIGHT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>Fuel used (kg)</label><input className={input} type="number" placeholder="64800" value={f.fuelKg} onChange={(e) => set("fuelKg", e.target.value)} /></div>
          <div><label className={label}>Event code (optional)</label>
            <select className={input} value={f.multiplier} onChange={(e) => set("multiplier", e.target.value)}>
              <option value="">None</option>
              {multipliers.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div><label className={label}>Remarks</label><textarea className={`${input} min-h-[80px]`} placeholder="Anything notable about the flight…" value={f.remarks} onChange={(e) => set("remarks", e.target.value)} /></div>
        {isCasual ? (
          <p className="rounded-xl border border-obsidian bg-ink-850 px-3.5 py-2.5 text-xs text-cream-faint">
            Casual mode builds rank hours only — no Strait Points, Logistic Coins or on-time bonus. Switch the flight type to Career or Cargo to earn rewards.
          </p>
        ) : (
          <>
            <label className={`flex items-center gap-2.5 text-sm ${lockPunctual ? "text-cream-faint" : "text-cream-dim"}`}>
              <input type="checkbox" checked={f.punctual} disabled={lockPunctual} onChange={(e) => set("punctual", e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)] disabled:opacity-50" />
              Filed within the punctuality window (+{punctBonus} {isCargo ? "LC" : "AP"} on-time bonus)
            </label>
            {lockPunctual && <p className="-mt-2 text-xs text-rose">Your accepted flight&apos;s completion window has expired — the punctuality bonus is unavailable.</p>}
          </>
        )}
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
      </div>

      {/* AP preview */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-obsidian">
          {isCasual ? (
            <>
              <div className="brand-wash px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Estimated reward</p>
                <p className="mt-1 font-display text-3xl font-semibold">Flight time only</p>
                <p className="mt-1 text-xs text-white/60">{cat ? AP_TABLE[cat].label : "—"} · Casual mode</p>
              </div>
              <div className="space-y-2 bg-ink-900 px-5 py-4 text-sm">
                <Row k="Strait Points" v="—" dim />
                <Row k="Logistic Coins" v="—" dim />
                <Row k="Rank hours" v={rawMin > 0 ? "✓ credited" : "—"} />
              </div>
            </>
          ) : isCargo ? (
            <>
              <div className="brand-wash px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Estimated reward</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl text-rose-soft">◈</span>
                  <span className="tnum font-display text-4xl font-semibold">{lc ? lc.toLocaleString() : "—"}</span>
                  <span className="text-sm text-white/60">LC</span>
                </p>
                <p className="mt-1 text-xs text-white/60">Cargo · Logistic Coins</p>
              </div>
              <div className="space-y-2 bg-ink-900 px-5 py-4 text-sm">
                <Row k="Base LC" v={lc ? `◈ ${lc.toLocaleString()}` : "—"} />
                <Row k="On-time bonus" v={punctual && punctBonus ? `+${punctBonus}` : "—"} dim={!punctual} />
                <div className="mt-1 border-t border-obsidian/60 pt-2"><Row k="Total" v={lc ? `◈ ${(lc + (punctual ? punctBonus : 0)).toLocaleString()}` : "—"} strong /></div>
              </div>
            </>
          ) : (
            <>
              <div className="brand-wash px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Estimated reward</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl text-rose-soft">✦</span>
                  <span className="tnum font-display text-4xl font-semibold">{ap ? ap.net.toLocaleString() : "—"}</span>
                  <span className="text-sm text-white/60">AP</span>
                </p>
                {cat && <p className="mt-1 text-xs text-white/60">{AP_TABLE[cat].label} · base ✦{AP_TABLE[cat].net.toLocaleString()}</p>}
              </div>
              <div className="space-y-2 bg-ink-900 px-5 py-4 text-sm">
                <Row k="Category" v={cat ? AP_TABLE[cat].label : "—"} />
                <Row k="Base AP" v={ap ? `✦ ${ap.base.toLocaleString()}` : "—"} />
                <Row k="On-time bonus" v={punctual && punctBonus ? `+${punctBonus}` : "—"} dim={!punctual} />
                <div className="mt-1 border-t border-obsidian/60 pt-2"><Row k="Total" v={ap ? `✦ ${ap.net.toLocaleString()}` : "—"} strong /></div>
              </div>
            </>
          )}
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(12,2,67,0.9)] transition-all hover:brightness-125 disabled:opacity-60">
          {busy ? "Filing…" : "Submit PIREP"}
        </button>
        <p className="text-center text-xs text-cream-faint">Cargo flights are paid in Logistic Coins after review. Spotlight (2×) bonuses apply automatically to qualifying sectors.</p>
      </div>
    </form>
  );
}

function Row({ k, v, dim, strong }: { k: string; v: string; dim?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={dim ? "text-cream-faint" : "text-cream-dim"}>{k}</span>
      <span className={strong ? "font-semibold text-cream" : dim ? "text-cream-faint" : "text-cream"}>{v}</span>
    </div>
  );
}
