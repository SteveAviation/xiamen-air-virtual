"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Buy a licence or unlock a codeshare — debits AP/LC via /api/crew/purchase.
   `canAfford` and `locked` gate the button; the server re-validates balance and
   ownership regardless. */
export function PurchaseButton({
  kind,
  item,
  cost,
  currency,
  canAfford,
  locked = false,
  lockedLabel,
  label = "Unlock",
}: {
  kind: "license" | "codeshare";
  item: string;
  cost: number;
  currency: "AP" | "LC";
  canAfford: boolean;
  locked?: boolean;
  lockedLabel?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    if (!window.confirm(`Spend ${cost.toLocaleString()} ${currency} to unlock ${item}?`)) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/crew/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, item }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Purchase failed.");
    }
  }

  if (locked) {
    return <span className="text-[0.65rem] text-cream-faint">🔒 {lockedLabel ?? "Locked"}</span>;
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        onClick={buy}
        disabled={busy || !canAfford}
        className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-medium text-white transition-all hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
        title={canAfford ? `${cost.toLocaleString()} ${currency}` : `Need ${cost.toLocaleString()} ${currency}`}
      >
        {busy ? "…" : canAfford ? `${label} · ${cost.toLocaleString()} ${currency}` : `Need ${cost.toLocaleString()} ${currency}`}
      </button>
      {error && <span className="text-[0.65rem] text-rose-400">{error}</span>}
    </span>
  );
}
