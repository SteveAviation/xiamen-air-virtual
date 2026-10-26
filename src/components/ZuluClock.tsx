"use client";

import { useEffect, useState } from "react";

/* Live ZULU (UTC) clock — HH:MM:SSZ, ticking every second. Renders a stable
   placeholder on the server to avoid a hydration mismatch, then starts on
   mount in the browser. */
export function ZuluClock({ className = "" }: { className?: string }) {
  const [t, setT] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setT(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono tabular-nums ${className}`}
      title="Zulu (UTC) time"
      suppressHydrationWarning
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
      {t ?? "--:--:--"}
      <span className="text-[0.7em] opacity-70">Z</span>
    </span>
  );
}
