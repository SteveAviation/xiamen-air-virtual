"use client";

import { useState } from "react";

/* Flip card for the routes page: front = Xiamen Gaoqi aerial, back = the
   airport diagram. Drop the real Infinite Flight screenshots in as
   /img/zsam-aerial.webp + /img/zsam-diagram.webp and they'll appear; until
   then a tasteful gradient placeholder is shown.
   Flips on hover (desktop) AND on tap (mobile). */
export function HubFlipCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className={`flip group block h-[320px] w-full text-left ${flipped ? "is-flipped" : ""}`}
    >
      <div className="flip-inner h-full w-full rounded-xl">
        {/* FRONT — aerial */}
        <div className="flip-face rounded-xl border border-obsidian">
          <div className="brand-wash flex h-full w-full flex-col justify-end p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Xiamen Gaoqi · ZSAM</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-white">Aerial view</h3>
            <p className="mt-1 text-sm text-white/65">One runway on the Taiwan Strait, gateway to Fujian.</p>
            <p className="mt-4 text-xs text-white/45">Tap or hover to view the airport diagram →</p>
          </div>
        </div>
        {/* BACK — diagram */}
        <div className="flip-face flip-back rounded-xl border border-obsidian">
          <div className="flex h-full w-full flex-col justify-end p-6" style={{ background: "linear-gradient(135deg,#0e1733,#1a2358 60%,#2a1b6b)" }}>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">ZSAM · Ground chart</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-white">Airport diagram</h3>
            <p className="mt-1 text-sm text-white/65">Stands, taxiways and runway layout from Infinite Flight.</p>
            <p className="mt-4 text-xs text-white/45">← Tap to flip back</p>
          </div>
        </div>
      </div>
    </button>
  );
}
