"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Leg = { to: [number, number]; code: string; city: string };
type LiveFlight = {
  id: string; callsign: string; lat: number; lon: number; heading: number;
  origin?: string; destination?: string; aircraft?: string;
};

export function LiveMap({ hub, legs }: { hub: [number, number]; legs: Leg[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      const dark = document.documentElement.classList.contains("dark");
      map = L.map(ref.current, { center: [52, 25], zoom: 3, minZoom: 2, worldCopyJump: true, attributionControl: true, zoomControl: true });
      const tiles = dark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      L.tileLayer(tiles, { subdomains: "abcd", maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);

      const blue = "#0c0243";
      const heather = "#7f1894";

      // network arcs from hub
      for (const leg of legs) {
        const pts = greatCircle(hub, leg.to, 24);
        L.polyline(pts, { color: blue, weight: 1, opacity: 0.28 }).addTo(map);
        L.circleMarker(leg.to, { radius: 2.5, color: heather, fillColor: heather, fillOpacity: 0.9, weight: 0 })
          .bindTooltip(`${leg.city} (${leg.code})`, { className: "lfm" })
          .addTo(map);
      }
      // hub
      L.circleMarker(hub, { radius: 6, color: blue, fillColor: "#7b6cf0", fillOpacity: 1, weight: 2 })
        .bindTooltip("Xiamen Gaoqi (ZSAM) · Hub", { className: "lfm", permanent: false }).addTo(map);

      // live flights
      try {
        const res = await fetch("/api/live-flights");
        const data = await res.json();
        if (cancelled) return;
        setConfigured(!!data.configured);
        const flights: LiveFlight[] = data.flights ?? [];
        setCount(flights.length);
        for (const f of flights) {
          const icon = L.divIcon({
            className: "lfm-plane",
            html: `<span class="lfm-plane-rot" style="transform:rotate(${f.heading ?? 0}deg)"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg></span>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
          });
          L.marker([f.lat, f.lon], { icon })
            .bindTooltip(`<div class="lfm-cs">${f.callsign}</div><div class="lfm-route">${f.origin ?? "?"} → ${f.destination ?? "?"}</div>`, { className: "lfm" })
            .addTo(map);
        }
      } catch { setCount(0); }
    })();

    return () => { cancelled = true; map?.remove(); };
  }, [hub, legs]);

  return (
    <div className="relative">
      <div ref={ref} className="lfm-map h-[68vh] min-h-[460px] w-full rounded-2xl border border-obsidian" />
      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-xl border border-obsidian bg-ink-900/90 px-3.5 py-2 text-sm backdrop-blur">
        <p className="flex items-center gap-2 font-medium text-cream">
          <span className="relative flex h-2 w-2"><span className={`absolute inline-flex h-full w-full rounded-full ${count ? "animate-ping bg-emerald-400" : "bg-rock"} opacity-70`} /><span className={`relative inline-flex h-2 w-2 rounded-full ${count ? "bg-emerald-500" : "bg-rock"}`} /></span>
          {count === null ? "Scanning network…" : count > 0 ? `${count} Xiamen Air flight${count === 1 ? "" : "s"} airborne` : "No Xiamen Air flights airborne"}
        </p>
        {!configured && <p className="mt-0.5 text-xs text-cream-faint">Live tracking goes online with an IF API key.</p>}
      </div>
    </div>
  );
}

/* great-circle interpolation between two [lat,lon] points */
function greatCircle(a: [number, number], b: [number, number], n: number): [number, number][] {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  const [lat1, lon1] = a.map(toRad);
  const [lat2, lon2] = b.map(toRad);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
  if (d === 0) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return pts;
}
