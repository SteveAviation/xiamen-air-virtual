"use client";

import { useState } from "react";
import type { SiteConfig } from "@/lib/siteConfig";

const input = "w-full rounded-md border border-obsidian bg-ink-850 px-3 py-2 text-sm text-cream outline-none focus:border-gold-soft";
const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-cream-faint";

export function SiteCmsForm({ initial }: { initial: SiteConfig }) {
  const [c, setC] = useState<SiteConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const setBrand = (k: keyof SiteConfig["brand"], v: string) => setC((s) => ({ ...s, brand: { ...s.brand, [k]: v } }));
  const setStat = (k: keyof SiteConfig["stats"], v: string) => setC((s) => ({ ...s, stats: { ...s.stats, [k]: k === "longestSector" ? v : Number(v) || 0 } }));
  const setAnn = (k: keyof SiteConfig["announcement"], v: string | boolean) => setC((s) => ({ ...s, announcement: { ...s.announcement, [k]: v } }));
  const setFlag = (k: keyof SiteConfig["flags"], v: boolean) => setC((s) => ({ ...s, flags: { ...s.flags, [k]: v } }));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const data = await res.json();
      if (res.ok) { setC(data.config); setMsg("Saved ✓ — changes are live."); }
      else setMsg(data.error || "Could not save.");
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const Toggle = ({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
    <label className="flex items-center justify-between gap-3 rounded-md border border-obsidian bg-ink-900 px-3 py-2.5 text-sm text-cream-dim">
      <span>{children}</span>
      <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-ink-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`} />
      </button>
    </label>
  );

  const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-obsidian bg-ink-900 p-5">
      <h2 className="font-display text-base font-semibold text-cream">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-cream-faint">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Brand & copy" hint="Shown on the home page and footer.">
          <div><label className={label}>Mission</label><textarea className={`${input} min-h-[90px]`} value={c.brand.mission} onChange={(e) => setBrand("mission", e.target.value)} /></div>
          <div><label className={label}>Tagline</label><input className={input} value={c.brand.tagline} onChange={(e) => setBrand("tagline", e.target.value)} /></div>
          <div><label className={label}>Footer disclaimer / copyright</label><textarea className={`${input} min-h-[70px]`} value={c.brand.copyright} onChange={(e) => setBrand("copyright", e.target.value)} /></div>
        </Section>

        <Section title="Headline stats" hint="The figures shown near the top of the home page.">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Aircraft</label><input type="number" className={input} value={c.stats.fleetCount} onChange={(e) => setStat("fleetCount", e.target.value)} /></div>
            <div><label className={label}>Destinations</label><input type="number" className={input} value={c.stats.airports} onChange={(e) => setStat("airports", e.target.value)} /></div>
            <div><label className={label}>Routes</label><input type="number" className={input} value={c.stats.routes} onChange={(e) => setStat("routes", e.target.value)} /></div>
            <div><label className={label}>Ranks</label><input type="number" className={input} value={c.stats.ranks} onChange={(e) => setStat("ranks", e.target.value)} /></div>
            <div><label className={label}>Hubs</label><input type="number" className={input} value={c.stats.hubs} onChange={(e) => setStat("hubs", e.target.value)} /></div>
            <div><label className={label}>Longest sector</label><input className={input} value={c.stats.longestSector} onChange={(e) => setStat("longestSector", e.target.value)} /></div>
          </div>
        </Section>

        <Section title="Announcement banner" hint="A site-wide notice across the top of every public page.">
          <Toggle on={c.announcement.enabled} onChange={(v) => setAnn("enabled", v)}>Show the announcement banner</Toggle>
          <div><label className={label}>Message</label><input className={input} placeholder="e.g. Group flight this Sunday, 18:00Z — sign up on Discord" value={c.announcement.text} onChange={(e) => setAnn("text", e.target.value)} /></div>
          <div>
            <label className={label}>Tone</label>
            <select className={input} value={c.announcement.tone} onChange={(e) => setAnn("tone", e.target.value)}>
              <option value="info">Info (blue)</option>
              <option value="warn">Warning (amber)</option>
            </select>
          </div>
        </Section>

        <Section title="Feature flags" hint="Toggle features without a redeploy.">
          <Toggle on={c.flags.applicationsOpen} onChange={(v) => setFlag("applicationsOpen", v)}>Applications open</Toggle>
          <Toggle on={c.flags.finnixEnabled} onChange={(v) => setFlag("finnixEnabled", v)}>Egret assistant enabled</Toggle>
          <Toggle on={c.flags.maintenance} onChange={(v) => setFlag("maintenance", v)}>Maintenance banner</Toggle>
        </Section>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={save} disabled={busy} className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-125 disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className="text-sm text-cream-dim">{msg}</span>}
        {c.updatedBy && <span className="ml-auto text-xs text-cream-faint">Last edited by {c.updatedBy}{c.updatedAt ? ` · ${new Date(c.updatedAt).toLocaleString("en-GB")}` : ""}</span>}
      </div>
    </div>
  );
}
