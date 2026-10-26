"use client";

import { useEffect, useState } from "react";

/* Counts down to the next 00:00 ZULU (UTC) — when ROTD, career dispatches and
   cargo contracts all roll over (they're seeded by the UTC day index). */
export function ResetCountdown({ className = "", label = "Dispatch resets in" }: { className?: string; label?: string }) {
  const [t, setT] = useState<string | null>(null);

  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const now = new Date();
      const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
      let s = Math.max(0, Math.floor((next - now.getTime()) / 1000));
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60); const sec = s % 60;
      setT(`${p(h)}:${p(m)}:${p(sec)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} suppressHydrationWarning>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="opacity-70"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {label} <span className="font-mono tabular-nums">{t ?? "--:--:--"}</span> <span className="opacity-70">(0000Z)</span>
    </span>
  );
}
