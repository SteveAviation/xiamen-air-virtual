/* ----------------------------------------------------------------
   Count Google Form application submissions, splitting "new" from "old".

   A submission is "new" if it was filed AFTER the most recent person joined
   the Discord server (i.e. the last person we accepted). Reads the responses
   sheet (shared "anyone with link") via the gviz JSON endpoint — no API key.
------------------------------------------------------------------- */

/* Pull the Timestamp column (epoch ms) for every response row. */
async function fetchTimestamps(sheetId: string): Promise<number[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const text = await res.text();
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const rows: any[] = json?.table?.rows ?? [];
    const out: number[] = [];
    for (const r of rows) {
      const v = r?.c?.[0]?.v;
      if (typeof v === "string") {
        // gviz dates: "Date(2025,9,12,17,7,45)" (month is 0-indexed)
        const m = v.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
        if (m) {
          out.push(
            new Date(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)).getTime(),
          );
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return out;
  } catch {
    return [];
  }
}

export type AppCount = { total: number; newCount: number; known: boolean };

/* Count submissions, and how many are newer than `cutoffMs` (the last join).
   `known` is false when we couldn't determine a cutoff (so "new" == total). */
export async function applicationCount(
  sheetId: string,
  cutoffMs: number | null,
): Promise<AppCount> {
  const ts = await fetchTimestamps(sheetId);
  const total = ts.length;
  if (cutoffMs == null) return { total, newCount: total, known: false };
  const newCount = ts.filter((t) => t > cutoffMs).length;
  return { total, newCount, known: true };
}
