"use client";

import { useState } from "react";

type FieldDef = { name: string; label: string; type?: "text" | "textarea" | "select" | "number"; options?: string[]; required?: boolean; placeholder?: string };

const PILOT: FieldDef[] = [
  { name: "ifc", label: "IFC username", required: true, placeholder: "your_ifc_name" },
  { name: "discord", label: "Discord username", required: true, placeholder: "username" },
  { name: "grade", label: "Infinite Flight grade", type: "select", options: ["Grade 3", "Grade 4", "Grade 5"], required: true },
  { name: "age", label: "Age", type: "number", placeholder: "16" },
  { name: "callsign", label: "Preferred callsign number (optional)", placeholder: "e.g. 042" },
  { name: "availability", label: "How often can you fly?", type: "select", options: ["A few flights a month", "Weekly", "Several times a week", "Daily"] },
  { name: "experience", label: "Tell us about your flying experience", type: "textarea", placeholder: "Hours, favourite routes, other VAs…" },
  { name: "why", label: "Why do you want to join Xiamen Air Virtual?", type: "textarea", required: true },
];

const STAFF: FieldDef[] = [
  { name: "ifc", label: "IFC username", required: true, placeholder: "your_ifc_name" },
  { name: "discord", label: "Discord username", required: true, placeholder: "username" },
  {
    name: "role", label: "Role you're applying for", type: "select", required: true,
    options: [
      "Chief Human Resources Officer (CHRO)",
      "Codeshare Officer",
      "Chief Marketing Officer (CMO)",
      "Social Media Manager",
      "Route Manager",
      "Event Manager",
      "Training Manager",
      "Flight Instructor",
      "Other / open to any role",
    ],
  },
  { name: "experience", label: "Relevant experience", type: "textarea", placeholder: "Previous staff roles, skills (design, dispatch, events)…" },
  { name: "availability", label: "Weekly availability", type: "select", options: ["1–3 hours", "3–6 hours", "6+ hours"] },
  { name: "why", label: "Why would you be a great fit?", type: "textarea", required: true },
];

export function ApplyForms() {
  const [tab, setTab] = useState<"pilot" | "staff">("pilot");
  const defs = tab === "pilot" ? PILOT : STAFF;
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(name: string, v: string) { setValues((s) => ({ ...s, [name]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    for (const d of defs) {
      if (d.required && !(values[d.name] ?? "").trim()) { setError(`${d.label} is required.`); return; }
    }
    setBusy(true);
    const fields = defs.map((d) => ({ label: d.label, value: values[d.name] ?? "" }));
    const res = await fetch("/api/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: tab, fields }),
    });
    setBusy(false);
    if (res.ok) { setDone(true); setValues({}); }
    else { const j = await res.json().catch(() => ({})); setError(j.error || "Could not submit. Try again."); }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-obsidian bg-ink-900 p-8 text-center">
        <p className="text-3xl">✈️</p>
        <h3 className="mt-3 font-display text-2xl font-semibold text-cream">Application received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-cream-dim">Thank you! Our recruitment team will review your application and reach out via the Infinite Flight Community to begin onboarding. Keep an eye on your IFC messages.</p>
        <button onClick={() => { setDone(false); }} className="mt-5 rounded-full border border-obsidian px-5 py-2 text-sm text-cream-dim hover:text-cream">Submit another</button>
      </div>
    );
  }

  const input = "w-full rounded-md border border-obsidian bg-ink-850 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold-soft";
  const label = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream-faint";

  return (
    <div>
      {/* tabs */}
      <div className="mb-6 inline-flex rounded-md border border-obsidian bg-ink-850 p-1">
        {(["pilot", "staff"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(""); }}
            className={`rounded px-5 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "bg-gold text-white" : "text-cream-dim hover:text-cream"}`}>
            {t} application
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-obsidian bg-ink-900 p-6 sm:grid-cols-2">
        {defs.map((d) => (
          <div key={d.name} className={d.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className={label}>{d.label}{d.required && <span className="text-gold-soft"> *</span>}</label>
            {d.type === "textarea" ? (
              <textarea className={`${input} min-h-[88px]`} placeholder={d.placeholder} value={values[d.name] ?? ""} onChange={(e) => set(d.name, e.target.value)} />
            ) : d.type === "select" ? (
              <select className={input} value={values[d.name] ?? ""} onChange={(e) => set(d.name, e.target.value)}>
                <option value="">Select…</option>
                {d.options!.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input type={d.type === "number" ? "number" : "text"} className={input} placeholder={d.placeholder} value={values[d.name] ?? ""} onChange={(e) => set(d.name, e.target.value)} />
            )}
          </div>
        ))}
        {error && <p className="sm:col-span-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-white transition-all hover:brightness-125 disabled:opacity-60">
            {busy ? "Submitting…" : `Submit ${tab} application`}
          </button>
          <p className="mt-2 text-xs text-cream-faint">Applications are reviewed by staff and a reply is sent via the Infinite Flight Community.</p>
        </div>
      </form>
    </div>
  );
}
