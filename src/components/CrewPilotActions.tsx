"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "accept" | "reject" | "suspend" | "reactivate";

export function CrewPilotActions({
  pilotId,
  actions,
}: {
  pilotId: number;
  actions: Action[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: Action) {
    setBusy(true);
    const res = await fetch("/api/crew/pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilotId, action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const style: Record<Action, string> = {
    accept: "bg-emerald-600/90 text-white hover:bg-emerald-500",
    reactivate: "bg-emerald-600/90 text-white hover:bg-emerald-500",
    reject: "border border-red-500/40 text-red-300 hover:bg-red-500/10",
    suspend: "border border-red-500/40 text-red-300 hover:bg-red-500/10",
  };
  const label: Record<Action, string> = {
    accept: "Accept",
    reactivate: "Reactivate",
    reject: "Reject",
    suspend: "Suspend",
  };

  return (
    <div className="flex shrink-0 gap-2">
      {actions.map((a) => (
        <button
          key={a}
          onClick={() => run(a)}
          disabled={busy}
          className={`rounded-full px-4 py-2 text-sm font-normal transition-colors disabled:opacity-60 ${style[a]}`}
        >
          {label[a]}
        </button>
      ))}
    </div>
  );
}
