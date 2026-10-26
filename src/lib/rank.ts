import { RANKS, type Rank } from "./data";

export type RankProgress = {
  current: Rank;
  next: Rank | null;
  /* 0–100 progress toward the next rank */
  pct: number;
  totalHours: number;
  hoursToNext: number | null;
};

/* Resolve a pilot's rank standing from their total logged minutes. */
export function rankFromMinutes(totalMinutes: number): RankProgress {
  const totalHours = totalMinutes / 60;

  let currentIndex = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (totalHours >= RANKS[i].hours) currentIndex = i;
  }

  const current = RANKS[currentIndex];
  const next = RANKS[currentIndex + 1] ?? null;

  if (!next) {
    return { current, next: null, pct: 100, totalHours, hoursToNext: null };
  }

  const span = next.hours - current.hours;
  const into = totalHours - current.hours;
  const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 0;

  return {
    current,
    next,
    pct,
    totalHours,
    hoursToNext: Math.max(0, next.hours - totalHours),
  };
}

/* "12h 34m" from minutes */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
