"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PilotHit = {
  id: number;
  callsign: string;
  displayName: string;
  rank: string | null;
  status: string;
  ifUsername: string | null;
  linked: boolean;
  warnings: number;
};
type PirepHit = {
  id: number;
  callsign: string;
  flightNo: string;
  dep: string;
  arr: string;
  aircraft: string;
  minutes: number;
  status: string;
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400",
  pending: "bg-gold-soft",
  suspended: "bg-red-400",
  approved: "bg-emerald-400",
  rejected: "bg-red-400",
};

function fmt(m: number) {
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function CrewSearch() {
  const [q, setQ] = useState("");
  const [pilots, setPilots] = useState<PilotHit[]>([]);
  const [pireps, setPireps] = useState<PirepHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setPilots([]);
      setPireps([]);
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/staff/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          setPilots(Array.isArray(d.pilots) ? d.pilots : []);
          setPireps(Array.isArray(d.pireps) ? d.pireps : []);
          setLoading(false);
        })
        .catch(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = pilots.length > 0 || pireps.length > 0;
  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-obsidian/60 bg-ink-850 px-4 py-2.5">
        <span aria-hidden className="text-cream-faint">⌕</span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search pilots, flights, PIREPs…"
          className="w-full bg-transparent text-sm text-cream placeholder:text-cream-faint focus:outline-none"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="text-cream-faint hover:text-cream"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-obsidian/60 bg-ink-900 p-2 shadow-2xl">
          {loading && !hasResults && (
            <p className="px-3 py-4 text-sm text-cream-faint">Searching…</p>
          )}
          {!loading && !hasResults && (
            <p className="px-3 py-4 text-sm text-cream-faint">
              No matches for “{q.trim()}”.
            </p>
          )}

          {pilots.length > 0 && (
            <div className="px-1 py-1">
              <p className="px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">
                Pilots
              </p>
              {pilots.map((p) => (
                <Link
                  key={p.id}
                  href="/staff/pilots"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 transition-colors hover:bg-ink-850"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[p.status] ?? "bg-cream-faint"}`} />
                    <span className="text-sm text-cream">{p.callsign}</span>
                    {p.warnings > 0 && (
                      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-1.5 text-[0.6rem] text-red-300">
                        ⚠ {p.warnings}
                      </span>
                    )}
                    {!p.linked && (
                      <span className="text-[0.6rem] uppercase tracking-wide text-cream-faint">
                        unlinked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 pl-3.5 text-xs text-cream-faint">
                    {p.rank ?? "Auto rank"}
                    {p.ifUsername ? ` · IF: ${p.ifUsername}` : ""} · {p.status}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {pireps.length > 0 && (
            <div className="px-1 py-1">
              <p className="px-2 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-cream-faint">
                Flights / PIREPs
              </p>
              {pireps.map((r) => (
                <Link
                  key={r.id}
                  href="/staff/pireps"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 transition-colors hover:bg-ink-850"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] ?? "bg-cream-faint"}`} />
                    <span className="text-sm text-cream">{r.flightNo || "PIREP"}</span>
                    <span className="font-mono text-xs text-gold-soft">
                      {r.dep}→{r.arr}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-3.5 text-xs text-cream-faint">
                    {r.callsign} · {r.aircraft} · {fmt(r.minutes)} · {r.status}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
