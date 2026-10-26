"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { REGIONS } from "@/lib/regions";

export type RegionLeg = { to: [number, number]; code: string; city: string; region: string; color: string };

export function RegionMap({ hub, legs, title }: { hub: [number, number]; legs: RegionLeg[]; title: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layersRef = useRef<Record<string, import("leaflet").LayerGroup>>({});
  const [active, setActive] = useState<Set<string>>(new Set(REGIONS.map((r) => r.name)));
  const [query, setQuery] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;
      const dark = document.documentElement.classList.contains("dark");
      const map = L.map(ref.current, { center: [24.5, 118], zoom: 3, minZoom: 2, worldCopyJump: true, zoomControl: true });
      mapRef.current = map;
      const tiles = dark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      L.tileLayer(tiles, { subdomains: "abcd", maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);

      // per-region layer groups
      for (const r of REGIONS) layersRef.current[r.name] = L.layerGroup().addTo(map);
      for (const leg of legs) {
        const g = layersRef.current[leg.region];
        if (!g) continue;
        L.polyline(greatCircle(hub, leg.to, 24), { color: leg.color, weight: 1.6, opacity: 0.7 }).addTo(g);
        L.circleMarker(leg.to, { radius: 3, color: leg.color, fillColor: leg.color, fillOpacity: 1, weight: 0 })
          .bindTooltip(`${leg.city} (${leg.code})`, { className: "lfm" })
          .on("click", () => router.push(`/destination/${leg.code}`))
          .addTo(g);
      }
      L.circleMarker(hub, { radius: 6, color: "#0c0243", fillColor: "#7b6cf0", fillOpacity: 1, weight: 2 })
        .bindTooltip("Xiamen Gaoqi (ZSAM) · Hub", { className: "lfm" })
        .addTo(map);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [hub, legs, router]);

  function toggle(name: string) {
    const map = mapRef.current;
    const g = layersRef.current[name];
    if (!map || !g) return;
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); map.removeLayer(g); }
      else { next.add(name); g.addTo(map); }
      return next;
    });
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    if (code.length < 3) { setErr("Enter a 3–4 letter ICAO/IATA code."); return; }
    setErr("");
    router.push(`/destination/${code}`);
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
      {err && <p className="px-4 pt-2 text-xs text-rose-500">{err}</p>}

      {/* Legend toggles */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {REGIONS.map((r) => {
          const on = active.has(r.name);
          return (
            <button key={r.name} onClick={() => toggle(r.name)}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-obsidian bg-ink-850 text-cream" : "border-obsidian/60 text-cream-faint opacity-60"}`}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: on ? r.color : "transparent", border: `1.5px solid ${r.color}` }} />
              {r.name}
            </button>
          );
        })}
      </div>

      <div ref={ref} className="lfm-map h-[58vh] min-h-[420px] w-full" />
    </div>
  );
}

function greatCircle(a: [number, number], b: [number, number], n: number): [number, number][] {
  const toRad = (x: number) => (x * Math.PI) / 180, toDeg = (x: number) => (x * 180) / Math.PI;
  const [lat1, lon1] = a.map(toRad), [lat2, lon2] = b.map(toRad);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
  if (d === 0) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return pts;
}
