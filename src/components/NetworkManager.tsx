"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Network = { name: string; price: number; currency: "AP" | "LC"; type: "career" | "cargo" };

/* Staff create the codeshare NETWORKS pilots can unlock (name + unlock price +
   career/cargo type). Career networks unlock with AP, cargo with LC. Add routes
   to a network separately in the routes panel. */
export function NetworkManager({ networks }: { networks: Network[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<"career" | "cargo">("career");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currency = type === "cargo" ? "LC" : "AP";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/crew/codeshare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addNetwork", name, price: Number(price) || 0, currency, type }),
    });
    setBusy(false);
    if (res.ok) { setName(""); setPrice(""); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); setError(j.error || "Could not add network."); }
  }

  async function del(n: string) {
    if (!window.confirm(`Remove the ${n} network? (Its routes stay in the database.)`)) return;
    const res = await fetch("/api/crew/codeshare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delNetwork", name: n }),
    });
    if (res.ok) router.refresh();
  }

  const input = "w-full rounded-xl border border-obsidian bg-ink-850 px-3.5 py-2.5 text-sm text-cream placeholder:text-cream-faint outline-none focus:border-gold";
  const label = "mb-1.5 block text-xs uppercase tracking-wide text-cream-faint";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={add} className="rounded-2xl border border-obsidian bg-ink-900 p-6">
        <h3 className="font-display text-xl font-semibold text-cream">Add unlockable network</h3>
        <p className="mt-1 text-sm text-cream-dim">Pilots unlock these with {currency}. Career networks cost AP; cargo networks cost LC.</p>
        <div className="mt-5 space-y-4">
          <div><label className={label}>Airline / network name</label><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Qatar Airways" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label}>Type</label>
              <select className={input} value={type} onChange={(e) => setType(e.target.value as "career" | "cargo")}>
                <option value="career">Career (AP)</option>
                <option value="cargo">Cargo (LC)</option>
              </select>
            </div>
            <div><label className={label}>Unlock price ({currency})</label><input className={input} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="10000" /></div>
          </div>
          {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={busy} className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-white transition-all hover:brightness-125 disabled:opacity-50">{busy ? "Adding…" : "Add network"}</button>
        </div>
      </form>

      <div>
        <h3 className="font-display text-xl font-semibold text-cream">Networks <span className="ml-2 rounded-full bg-gold/10 px-2.5 py-0.5 text-sm text-gold">{networks.length}</span></h3>
        <div className="mt-4 space-y-2">
          {networks.length === 0 && <div className="rounded-2xl border border-dashed border-obsidian bg-ink-900 p-8 text-center text-sm text-cream-faint">No custom networks yet. Jet Airways (free) &amp; Qatar are built in.</div>}
          {networks.map((n) => (
            <div key={n.name} className="flex items-center justify-between rounded-xl border border-obsidian bg-ink-900 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-cream">{n.name}</p>
                <p className="text-xs text-cream-faint">{n.type === "cargo" ? "Cargo" : "Career"} · unlock {n.currency === "AP" ? "✦" : "◈"} {n.price.toLocaleString()} {n.currency}</p>
              </div>
              <button onClick={() => del(n.name)} className="rounded-full border border-obsidian px-3 py-1.5 text-xs text-cream-faint hover:border-rose/50 hover:text-rose">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
