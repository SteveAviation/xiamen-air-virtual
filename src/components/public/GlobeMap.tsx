"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REGIONS } from "@/lib/regions";
import { HUB_COORDS as HUB, HUB_ICAO, hubCity } from "@/lib/network";
import type { RegionLeg } from "./RegionMap";


/* Some region brand colours are too dark to read against the night globe
   (Fujian's deep navy in particular). Override those for on-globe rendering
   only — the legend chips below match these so the map stays consistent. */
/* Read a CSS design token off <html>, with a fallback. */
function token(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const GLOBE_COLOR: Record<string, string> = { Fujian: "#5B8DEF" };
const gc = (region: string, color: string) => GLOBE_COLOR[region] ?? color;

type Arc = { startLat: number; startLng: number; endLat: number; endLng: number; color: string; region: string; codeshare?: boolean };
type Pt = { lat: number; lng: number; color: string; region: string; code: string; city: string; isHub?: boolean };

export function GlobeMap({ legs, title, codeshareLegs = [] }: { legs: RegionLeg[]; title: string; codeshareLegs?: RegionLeg[] }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<{ arcsData: (d: Arc[]) => void; pointsData: (d: Pt[]) => void; controls: () => { autoRotate: boolean }; _destructor?: () => void } | null>(null);
  const [active, setActive] = useState<Set<string>>(new Set(REGIONS.map((r) => r.name)));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [rotate, setRotate] = useState(true);
  const [showCodeshare, setShowCodeshare] = useState(false);

  const mainArcs: Arc[] = legs.map((l) => ({ startLat: HUB[0], startLng: HUB[1], endLat: l.to[0], endLng: l.to[1], color: gc(l.region, l.color), region: l.region }));
  const csArcs: Arc[] = codeshareLegs.map((l) => ({ startLat: HUB[0], startLng: HUB[1], endLat: l.to[0], endLng: l.to[1], color: gc(l.region, l.color), region: l.region, codeshare: true }));
  const allPts: Pt[] = [
    { lat: HUB[0], lng: HUB[1], color: token("--color-gold", "#888"), region: "__hub__", code: HUB_ICAO, city: hubCity(), isHub: true },
    ...legs.map((l) => ({ lat: l.to[0], lng: l.to[1], color: gc(l.region, l.color), region: l.region, code: l.code, city: l.city })),
  ];

  // Recompute what's drawn from the current filters.
  function applyFilters(world: { arcsData: (d: Arc[]) => void; pointsData: (d: Pt[]) => void }, set: Set<string>, codeshare: boolean) {
    const arcs = [...mainArcs, ...(codeshare ? csArcs : [])].filter((a) => set.has(a.region));
    world.arcsData(arcs);
    world.pointsData(allPts.filter((p) => p.isHub || set.has(p.region)));
  }

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let onResize: (() => void) | null = null;
    let cleanupPointer: (() => void) | null = null;
    (async () => {
      const Globe = (await import("globe.gl")).default;
      if (cancelled || !wrapRef.current) return;
      const el = wrapRef.current;
      const dark = document.documentElement.classList.contains("dark");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const world: any = new (Globe as any)(el)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("/globe/earth-dark.jpg")
        .bumpImageUrl("/globe/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereColor(dark ? "#7b6cf0" : "#3b6fe0")
        .atmosphereAltitude(0.18)
        .arcColor("color")
        .arcStroke((a: Arc) => (a.codeshare ? 0.4 : 0.55))
        .arcAltitudeAutoScale(0.45)
        .arcDashLength((a: Arc) => (a.codeshare ? 0.2 : 0.45))
        .arcDashGap((a: Arc) => (a.codeshare ? 0.35 : 0.25))
        .arcDashAnimateTime(2600)
        .arcsTransitionDuration(0)
        .pointColor("color")
        .pointAltitude(0.01)
        .pointRadius((d: Pt) => (d.isHub ? 0.8 : 0.6))
        .pointsMerge(false)
        .pointLabel((d: Pt) => `<div style="font:600 12px/1.2 system-ui;color:#fff;background:${token("--color-cream", "#121214")};padding:4px 8px;border-radius:6px">${d.city} (${d.code})</div>`)
        .onPointClick((d: Pt) => { if (!d.isHub) router.push(`/destination/${d.code}`); })
        .width(el.clientWidth)
        .height(el.clientHeight);

      applyFilters(world, active, showCodeshare);
      world.pointOfView({ lat: HUB[0], lng: HUB[1], altitude: 2.1 }, 0);
      const controls = world.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = true;
      controls.minDistance = 180;
      globeRef.current = world;
      setRotate(true);
      setLoading(false);

      // Track the CONTAINER size (handles iPad rotation, split-view, font scaling,
      // and late layout) — far more reliable than a window resize listener alone.
      const fit = () => world.width(el.clientWidth).height(el.clientHeight);
      ro = new ResizeObserver(fit);
      ro.observe(el);
      fit();
      // Tablets settle layout a frame late and fire orientationchange (not always
      // a ResizeObserver tick), so refit on both as well.
      requestAnimationFrame(fit);
      onResize = fit;
      window.addEventListener("orientationchange", fit);
      window.addEventListener("resize", fit);

      // A spinning globe makes points a moving target — especially on touch,
      // where a tap on a moving dot registers as a drag and never fires the
      // click. Stop auto-rotation on first interaction so cities are tappable.
      const stopSpin = () => {
        const c = world.controls();
        if (c.autoRotate) { c.autoRotate = false; setRotate(false); }
      };
      el.addEventListener("pointerdown", stopSpin);
      cleanupPointer = () => el.removeEventListener("pointerdown", stopSpin);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      cleanupPointer?.();
      if (onResize) {
        window.removeEventListener("orientationchange", onResize);
        window.removeEventListener("resize", onResize);
      }
      globeRef.current?._destructor?.();
      if (wrapRef.current) wrapRef.current.innerHTML = "";
      globeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(name: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      if (globeRef.current) applyFilters(globeRef.current, next, showCodeshare);
      return next;
    });
  }

  function toggleRotate() {
    setRotate((r) => {
      const next = !r;
      const w = globeRef.current;
      if (w) w.controls().autoRotate = next;
      return next;
    });
  }

  function toggleCodeshare() {
    if (!codeshareLegs.length) return; // nothing to show yet
    setShowCodeshare((s) => {
      const next = !s;
      if (globeRef.current) applyFilters(globeRef.current, active, next);
      return next;
    });
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    if (code.length >= 3) router.push(`/destination/${code}`);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-obsidian bg-ink-900">
      <div className="flex flex-col gap-3 border-b border-obsidian/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="font-display text-lg font-semibold text-cream">{title}</h3>
        <form onSubmit={search} className="relative w-full lg:max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream-faint" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search destination — e.g. OTHH"
            className="w-full rounded-md border border-obsidian bg-ink-850 py-2 pl-9 pr-3 text-sm uppercase text-cream placeholder:normal-case placeholder:text-cream-faint outline-none focus:border-gold-soft" />
        </form>
      </div>

      {/* Region legend */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {REGIONS.map((r) => {
          const on = active.has(r.name);
          const col = gc(r.name, r.color);
          return (
            <button key={r.name} onClick={() => toggle(r.name)}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-obsidian bg-ink-850 text-cream" : "border-obsidian/60 text-cream-faint opacity-60"}`}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: on ? col : "transparent", border: `1.5px solid ${col}` }} />
              {r.name}
            </button>
          );
        })}
      </div>

      {/* View controls */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button onClick={toggleRotate}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${rotate ? "border-gold/40 bg-gold/[0.08] text-gold-soft" : "border-obsidian text-cream-faint"}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
          {rotate ? "Auto-rotate on" : "Auto-rotate off"}
        </button>
        <button onClick={toggleCodeshare} disabled={!codeshareLegs.length}
          title={codeshareLegs.length ? "Toggle codeshare partner routes" : "Codeshare routes will appear here as partners are added"}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${showCodeshare && codeshareLegs.length ? "border-rose/50 bg-rose/[0.08] text-rose" : "border-obsidian text-cream-faint"}`}>
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed" style={{ borderColor: "var(--color-rose)" }} />
          Codeshare routes{codeshareLegs.length ? ` (${codeshareLegs.length})` : " · soon"}
        </button>
      </div>

      <div className="relative">
        <div ref={wrapRef} className="aspect-square max-h-[68vh] min-h-[360px] w-full sm:aspect-[16/10] lg:aspect-auto lg:h-[62vh]" style={{ background: "radial-gradient(ellipse at 50% 40%, #1a1147 0%, #0a0524 70%)" }} />
        {loading && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">Loading globe…</div>}
        <p className="pointer-events-none absolute bottom-3 left-4 text-[0.7rem] text-white/45">Drag to rotate · scroll to zoom · click a city for details</p>
      </div>
    </div>
  );
}
