"use client";

import { useState } from "react";
import type { FleetAircraft } from "@/lib/fleet";
import { isAtHub, fleetLocationLabel } from "@/lib/fleet";

type Group = { type: string; tails: FleetAircraft[] };

/* Demo board — pilots can claim an idle aircraft. Assignment is local-only for
   the demo; at launch this will be staff-gated and persisted. */
export function FleetBoard({ groups, pilotName }: { groups: Group[]; pilotName: string }) {
  // Local override map: reg -> assigned pilot (or null when released).
  const [claims, setClaims] = useState<Record<string, string | null>>({});
  const who = (a: FleetAircraft) => (a.reg in claims ? claims[a.reg] : a.assignedPilot);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.type}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-cream">{g.type}</h3>
            <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-cream-faint">×{g.tails.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tails.map((a) => {
              const assigned = who(a);
              const atHub = isAtHub(a.location);
              const mine = assigned === pilotName;
              return (
                <div key={a.reg} className={`rounded-2xl border p-4 ${atHub ? "border-obsidian bg-ink-900" : "border-gold/30 bg-gold/[0.04]"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-cream">{a.reg}</span>
                    {atHub ? (
                      <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-cream-faint">At hub</span>
                    ) : (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-gold">Ferry 1.5×</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-cream-faint">Currently at</p>
                  <p className="text-sm text-cream-dim">{fleetLocationLabel(a.location)}</p>

                  <div className="mt-3 border-t border-obsidian/50 pt-3">
                    {assigned ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm text-cream">
                          <span className="text-cream-faint">Assigned · </span>{assigned}{mine && " (you)"}
                        </span>
                        {mine && (
                          <button onClick={() => setClaims((c) => ({ ...c, [a.reg]: null }))}
                            className="shrink-0 rounded-full border border-obsidian px-2.5 py-1 text-xs text-cream-dim hover:text-cream">Release</button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => setClaims((c) => ({ ...c, [a.reg]: pilotName }))}
                        className="w-full rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-125">
                        Assign to me
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
