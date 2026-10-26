"use client";

/* ----------------------------------------------------------------
   Crew Centre — live traffic on an interactive 3D globe.

   Drag to rotate, scroll to zoom, click an aircraft for its flight card.
   The route network is drawn as context arcs; live Infinite Flight traffic
   is layered on top as HTML plane markers rotated to their real heading,
   each trailing the path it has actually flown.

   Brand colours are read from the CSS design tokens at runtime, so this
   component is identical across every VA clone — it repaints itself from
   whatever `--color-gold` / `--color-rose` the airline defines.
------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NetworkLeg } from "@/lib/network";

export type LiveFlight = {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  server: string | null;
  aircraft: string | null;
  livery: string | null;
  origin: string | null;
  destination: string | null;
  plannedPath?: [number, number][];
  track?: [number, number][];
};

type Arc = {
  startLat: number; startLng: number; endLat: number; endLng: number;
  color: string; kind: "network" | "codeshare" | "planned";
};
type Pt = { lat: number; lng: number; color: string; size: number; label: string; isHub?: boolean };
type Path = { pts: [number, number][]; color: string };

const REFRESH_MS = 25_000;

/* three.js colour parsing only understands plain CSS colour keywords and hex —
   NOT oklch(), which several of our design-token palettes use. Reading a token
   straight off <html> and appending an alpha suffix produced strings like
   "oklch(0.58 0.13 243)66", which three-globe resolves to null and then throws
   on (`colorAlpha` → "Cannot read properties of null"). So the accent arrives
   as an explicit hex prop, and alpha is only ever appended to a real hex. */
function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

/* The live feed is real-world messy: aircraft sitting on a gate can report a
   zero-length track, and individual track samples occasionally come back null
   or out of range. Feeding any of that to three.js yields NaN geometry and a
   console full of "Computed radius is NaN". Everything below is sanitised
   before it reaches the globe. */
function isLatLng(p: unknown): p is [number, number] {
  if (!Array.isArray(p) || p.length < 2) return false;
  const [lat, lng] = p as [number, number];
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

function cleanPath(pts: unknown): [number, number][] {
  return Array.isArray(pts) ? (pts.filter(isLatLng) as [number, number][]) : [];
}

/* A flight we can actually place on the globe. */
function isPlottable(f: LiveFlight): boolean {
  return Number.isFinite(f.lat) && Number.isFinite(f.lon) &&
    f.lat >= -90 && f.lat <= 90 && f.lon >= -180 && f.lon <= 180;
}

function fmtAlt(ft: number): string {
  return ft >= 18000 ? `FL${Math.round(ft / 100)}` : `${ft.toLocaleString()} ft`;
}

export function LiveGlobe({
  legs,
  codeshareLegs = [],
  hub,
  hubLabel,
  accent,
  accentSoft,
  backdrop,
  live = true,
}: {
  legs: NetworkLeg[];
  /* Partner sectors that share the route database, drawn thinner and dashed
     behind our own metal. Omit when the VA has no codeshares. */
  codeshareLegs?: NetworkLeg[];
  hub: [number, number];
  hubLabel: string;
  /* Brand colours as PLAIN HEX (#rrggbb) — see withAlpha above. */
  accent: string;
  accentSoft?: string;
  backdrop?: string;
  /* Set false for a VA with no /api/live-flights endpoint: the globe renders
     the network only, with no polling and no "traffic offline" notice (which
     would wrongly imply a missing API key). */
  live?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worldRef = useRef<any>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const flightsRef = useRef<LiveFlight[]>([]);
  const selectedRef = useRef<string | null>(null);

  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [booting, setBooting] = useState(true);
  const [rotate, setRotate] = useState(true);
  const [showNetwork, setShowNetwork] = useState(true);
  const [showCodeshare, setShowCodeshare] = useState(false);

  const selectedFlight = useMemo(
    () => flights.find((f) => f.id === selected) ?? null,
    [flights, selected],
  );

  /* ---- data ---- */
  const load = useCallback(async () => {
    if (!live) return;
    try {
      const res = await fetch("/api/live-flights", { cache: "no-store" });
      const json = await res.json();
      setConfigured(!!json.configured);
      const incoming: LiveFlight[] = Array.isArray(json.flights) ? json.flights : [];
      // globe.gl's HTML layer diffs marker data by OBJECT IDENTITY. A fresh
      // JSON.parse every poll would give every aircraft a new identity, so the
      // whole marker layer is torn down and rebuilt — a visible flicker every
      // refresh. Reuse the previous object for an id we already track and just
      // update its fields in place, so unchanged aircraft keep their markers.
      const prev = new Map(flightsRef.current.map((f) => [f.id, f]));
      const list = incoming.filter(isPlottable).map((f) => {
        const existing = prev.get(f.id);
        return existing ? Object.assign(existing, f) : f;
      });
      flightsRef.current = list;
      setFlights(list);
      setUpdatedAt(new Date());
      // Drop the selection if that aircraft has landed / left the server.
      if (selectedRef.current && !list.some((f) => f.id === selectedRef.current)) {
        selectedRef.current = null;
        setSelected(null);
      }
    } catch {
      setConfigured(false);
    }
  }, [live]);

  useEffect(() => {
    if (!live) return;
    // `load` is async and only touches state after its await, so this is a
    // subscription to an external system rather than a synchronous setState —
    // the lint rule cannot see through the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load, live]);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /* ---- globe ---- */
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let refit: (() => void) | null = null;
    let cleanupPointer: (() => void) | null = null;

    (async () => {
      const Globe = (await import("globe.gl")).default;
      if (cancelled || !wrapRef.current) return;
      const el = wrapRef.current;
      const dark = document.documentElement.classList.contains("dark");
      const brand = accent;
      const glow = accentSoft ?? accent;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const world: any = new (Globe as any)(el)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("/globe/earth-dark.jpg")
        .bumpImageUrl("/globe/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereColor(dark ? glow : brand)
        .atmosphereAltitude(0.16)
        // network + planned-route arcs
        .arcColor("color")
        .arcStroke((a: Arc) => (a.kind === "planned" ? 0.5 : a.kind === "codeshare" ? 0.16 : 0.28))
        .arcAltitudeAutoScale(0.4)
        .arcDashLength((a: Arc) => (a.kind === "planned" ? 0.5 : a.kind === "codeshare" ? 0.25 : 1))
        .arcDashGap((a: Arc) => (a.kind === "planned" ? 0.25 : a.kind === "codeshare" ? 0.3 : 0))
        .arcDashAnimateTime((a: Arc) => (a.kind === "planned" ? 3000 : 0))
        .arcsTransitionDuration(0)
        // airports
        .pointColor("color")
        .pointAltitude(0.006)
        .pointRadius((d: Pt) => d.size)
        .pointsMerge(false)
        .pointLabel((d: Pt) => d.label)
        // flown tracks
        .pathPoints("pts")
        .pathPointLat((p: [number, number]) => p[0])
        .pathPointLng((p: [number, number]) => p[1])
        .pathColor((p: Path) => p.color)
        .pathStroke(1.2)
        .pathPointAlt(0.012)
        .pathTransitionDuration(0)
        /* Aircraft layer.
           NOTE: globe.gl's HTML (CSS2D) layer is NOT used here. Its overlay is
           created at the container's mount-time size — 0x0 inside an
           aspect-ratio box — and neither .width()/.height() nor a ResizeObserver
           ever propagates a new size to it, so markers project to 0,0 and are
           effectively invisible. The labels layer renders in WebGL through the
           same camera as the globe, so it has no such dependency. */
        .labelsData([])
        .labelLat((f: LiveFlight) => f.lat)
        .labelLng((f: LiveFlight) => f.lon)
        .labelAltitude(0.014)
        .labelText((f: LiveFlight) => f.callsign)
        .labelSize((f: LiveFlight) => (f.id === selectedRef.current ? 1.1 : 0.8))
        .labelDotRadius((f: LiveFlight) => (f.id === selectedRef.current ? 0.5 : 0.34))
        .labelColor((f: LiveFlight) => (f.id === selectedRef.current ? "#ffffff" : accent))
        .labelResolution(2)
        .labelsTransitionDuration(0)
        .onLabelClick((f: LiveFlight) => {
          setSelected((cur) => (cur === f.id ? null : f.id));
        })
        .width(el.clientWidth)
        .height(el.clientHeight);

      world.pointOfView({ lat: hub[0], lng: hub[1], altitude: 2.2 }, 0);
      const controls = world.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = true;
      controls.minDistance = 170;
      worldRef.current = world;
      setBooting(false);

      const fit = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w && h) world.width(w).height(h);
      };
      fitRef.current = fit;
      ro = new ResizeObserver(fit);
      ro.observe(el);
      fit();
      requestAnimationFrame(fit);
      refit = fit;
      window.addEventListener("orientationchange", fit);
      window.addEventListener("resize", fit);

      // A spinning globe makes aircraft a moving target — a tap on a moving
      // marker reads as a drag and never fires a click. Stop on first touch.
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
      fitRef.current = null;
      if (refit) {
        window.removeEventListener("orientationchange", refit);
        window.removeEventListener("resize", refit);
      }
      worldRef.current?._destructor?.();
      worldRef.current = null;
    };
  }, [hub, accent, accentSoft]);

  /* ---- repaint layers whenever data or filters change ---- */
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const brand = accent;
    const ink = "#ffffff";
    const surface = "rgba(17,17,17,0.92)";

    const networkArcs: Arc[] = showNetwork
      ? legs.map((l) => ({
          startLat: hub[0], startLng: hub[1],
          endLat: l.to[0], endLng: l.to[1],
          color: l.color, kind: "network" as const,
        }))
      : [];

    // The selected flight also shows the route it filed, hub-to-hub.
    const plannedArcs: Arc[] = [];
    const sel = flights.find((f) => f.id === selected);
    const selPlanned = cleanPath(sel?.plannedPath);
    if (selPlanned.length > 1) {
      const p = selPlanned;
      plannedArcs.push({
        startLat: p[0][0], startLng: p[0][1],
        endLat: p[p.length - 1][0], endLng: p[p.length - 1][1],
        color: brand, kind: "planned",
      });
    }
    const codeshareArcs: Arc[] = showCodeshare
      ? codeshareLegs.map((l) => ({
          startLat: hub[0], startLng: hub[1],
          endLat: l.to[0], endLng: l.to[1],
          color: withAlpha(l.color, "99"), kind: "codeshare" as const,
        }))
      : [];
    world.arcsData([...codeshareArcs, ...networkArcs, ...plannedArcs]);

    const chip = (title: string, sub: string) =>
      `<div style="font:600 12px/1.3 system-ui;color:${ink};background:${surface};` +
      `border:1px solid ${withAlpha(brand, "55")};padding:5px 9px;border-radius:7px;white-space:nowrap;` +
      `box-shadow:0 6px 20px -8px rgba(0,0,0,.45)">${title}` +
      (sub ? `<div style="font-weight:400;opacity:.7;margin-top:1px">${sub}</div>` : "") +
      `</div>`;

    world.pointsData([
      { lat: hub[0], lng: hub[1], color: brand, size: 0.75, label: chip(hubLabel, "Main hub"), isHub: true },
      ...(showNetwork
        ? legs.map((l) => ({
            lat: l.to[0], lng: l.to[1], color: l.color, size: 0.45,
            label: chip(`${l.city} (${l.code})`, l.region),
          }))
        : []),
      ...(showCodeshare
        ? codeshareLegs.map((l) => ({
            lat: l.to[0], lng: l.to[1], color: l.color, size: 0.3,
            label: chip(`${l.city} (${l.code})`, `${l.region} · codeshare`),
          }))
        : []),
    ] as Pt[]);

    // Trail = the path each aircraft has actually flown.
    world.pathsData(
      flights
        .map((f) => ({
          pts: cleanPath(f.track),
          color: f.id === selected ? brand : withAlpha(brand, "66"),
        }))
        .filter((p) => p.pts.length > 1) as Path[],
    );

    // Aircraft — data only; the accessors were registered at init. Re-setting
    // the data is also what repaints the selected aircraft's size/colour.
    world.labelsData([...flights]);
  }, [flights, selected, legs, codeshareLegs, hub, hubLabel, showNetwork, showCodeshare, accent]);

  function toggleRotate() {
    const c = worldRef.current?.controls?.();
    if (!c) return;
    c.autoRotate = !c.autoRotate;
    setRotate(c.autoRotate);
  }

  function flyTo(f: LiveFlight) {
    worldRef.current?.pointOfView({ lat: f.lat, lng: f.lon, altitude: 1.1 }, 900);
    const c = worldRef.current?.controls?.();
    if (c?.autoRotate) { c.autoRotate = false; setRotate(false); }
  }

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-obsidian bg-ink-900">
        {/* status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${!live || configured ? "bg-gold" : "bg-cream-faint"}`} />
            <span className="text-sm font-semibold text-cream">
              {!live
                ? `${legs.length} destinations`
                : configured === null
                  ? "Connecting…"
                  : configured
                    ? `${flights.length} airborne`
                    : "Live traffic offline"}
            </span>
            {updatedAt && live && configured && (
              <span className="text-xs text-cream-faint tnum">
                updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {codeshareLegs.length > 0 && (
              <button
                onClick={() => setShowCodeshare((v) => !v)}
                className="rounded-full border border-obsidian px-3 py-1 text-xs text-cream-dim transition-colors hover:text-cream"
              >
                {showCodeshare ? "Hide codeshares" : `Codeshares (${codeshareLegs.length})`}
              </button>
            )}
            <button
              onClick={() => setShowNetwork((v) => !v)}
              className="rounded-full border border-obsidian px-3 py-1 text-xs text-cream-dim transition-colors hover:text-cream"
            >
              {showNetwork ? "Hide network" : "Show network"}
            </button>
            <button
              onClick={toggleRotate}
              className="rounded-full border border-obsidian px-3 py-1 text-xs text-cream-dim transition-colors hover:text-cream"
            >
              {rotate ? "Auto-rotate on" : "Auto-rotate off"}
            </button>
            {live && (
              <button
                onClick={load}
                className="rounded-full bg-gold px-3 py-1 text-xs font-medium text-white"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        <div
          ref={wrapRef}
          className="aspect-square max-h-[72vh] min-h-[380px] w-full sm:aspect-[16/10]"
          style={{ background: backdrop ?? "radial-gradient(ellipse at 50% 40%, #2a0d10 0%, #100405 70%)" }}
        />

        {booting && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-white/60">
            Loading globe…
          </div>
        )}

        {/* offline notice — the network still renders, so the page is never blank */}
        {live && configured === false && (
          <div className="absolute inset-x-4 bottom-4 rounded-xl border border-obsidian bg-ink-950/92 p-3 text-xs text-cream-dim backdrop-blur">
            Live traffic needs an Infinite Flight Live API key. Set{" "}
            <code className="rounded bg-ink-850 px-1 py-0.5 text-cream">IF_API_KEY</code> to plot
            real aircraft here — the route network below is showing in the meantime.
          </div>
        )}
      </div>

      {/* flight card */}
      {selectedFlight && (
        <div className="mt-3 rounded-2xl border border-obsidian bg-ink-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-cream">{selectedFlight.callsign}</p>
              <p className="mt-0.5 text-sm text-cream-dim">
                {selectedFlight.origin ?? "—"} → {selectedFlight.destination ?? "—"}
                {selectedFlight.aircraft ? ` · ${selectedFlight.aircraft}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => flyTo(selectedFlight)} className="rounded-full border border-obsidian px-3 py-1 text-xs text-cream-dim hover:text-cream">
                Centre on aircraft
              </button>
              <button onClick={() => setSelected(null)} className="rounded-full border border-obsidian px-3 py-1 text-xs text-cream-dim hover:text-cream">
                Close
              </button>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Altitude", fmtAlt(selectedFlight.altitude)],
              ["Ground speed", `${selectedFlight.speed} kt`],
              ["Heading", `${selectedFlight.heading}°`],
              ["Server", selectedFlight.server ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-obsidian/60 bg-ink-850 p-3">
                <dt className="text-[0.65rem] uppercase tracking-wide text-cream-faint">{k}</dt>
                <dd className="mt-0.5 font-semibold text-cream tnum">{v}</dd>
              </div>
            ))}
          </dl>
          {selectedFlight.livery && (
            <p className="mt-3 text-xs text-cream-faint">Livery · {selectedFlight.livery}</p>
          )}
        </div>
      )}

      {/* traffic list */}
      {live && configured && flights.length > 0 && (
        <div className="mt-3 rounded-2xl border border-obsidian bg-ink-900 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-cream-faint">Airborne now</p>
          <div className="flex flex-wrap gap-2">
            {flights.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelected(f.id); flyTo(f); }}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  f.id === selected
                    ? "border-gold bg-gold text-white"
                    : "border-obsidian text-cream-dim hover:text-cream"
                }`}
              >
                {f.callsign}
                <span className="ml-1.5 opacity-70">{f.origin ?? "?"}→{f.destination ?? "?"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
