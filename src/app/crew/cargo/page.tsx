import { getPilotDashboard, fmtHours } from "@/lib/portal";
import { getCargoContracts } from "@/lib/ops";
import { CARGO_CERTS, CARGO_TABLE, CARGO_CODESHARES, cargoPunctualityBonus, type Codeshare } from "@/lib/career";
import { getOpsConfig } from "@/lib/opsStore";
import { airportCity } from "@/lib/airports";
import { Locked } from "@/components/portal/Locked";
import { CargoDispatch, type CargoLeg } from "@/components/portal/CargoDispatch";
import { CodeshareInventory } from "@/components/portal/CodeshareInventory";
import { ResetCountdown } from "@/components/portal/ResetCountdown";

export const metadata = { title: "Cargo · Logistics Command" };
export const dynamic = "force-dynamic";

export default async function CargoPage() {
  const d = await getPilotDashboard();
  if (!d) return null;
  if (!d.gates.cargo) {
    return <Locked title="Logistics Command" rank="Zenith" hours={600} current={d.totalHours} blurb="The Cargo track — freight contracts paid in Logistic Coins (LC) — opens at Zenith, the peak of the core ladder." accent="rose" />;
  }

  const cert = d.cargoCert;
  const cargoBonus = cargoPunctualityBonus(cert.name);
  const contracts = getCargoContracts(d.session.pilotId, d.cargoHours, d.lcBalance);
  const opsCfg = await getOpsConfig();
  const cargoCodeshares: Codeshare[] = [
    ...CARGO_CODESHARES,
    ...opsCfg.networks.filter((n) => n.type === "cargo").map((n) => ({ name: n.name, cost: n.price, free: n.price === 0 })),
  ];
  const legs: CargoLeg[] = contracts.map((c) => ({
    id: c.id, dep: c.dep, arr: c.arr, depCity: airportCity(c.dep), arrCity: airportCity(c.arr),
    flightNo: c.flightNo, aircraft: c.aircraft, timeLabel: fmtHours(c.minutes),
    riskLabel: c.riskLabel, risk: c.risk, scenario: c.scenario, potentialLc: c.lc, lcMin: c.lcMin,
    punctualBonus: cargoBonus, windowMinutes: c.minutes + 120,
  }));
  const codeshareUnlocked = cert.name === "Freight Architect";

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow" style={{ color: "var(--color-rose)" }}>Logistics Command · Cargo Track</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Freight operations</h1>
          <p className="mt-2 max-w-xl text-cream-dim"><span className="italic">Precision</span> — move freight out of <span className="text-cream">Xiamen</span> &amp; <span className="text-cream">Fuzhou</span> to earn Logistic Coins (LC). LC are strictly for cargo — separate from your Strait Points.</p>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-wide text-cream-faint">Certification</p>
          <p className="font-display text-xl font-semibold text-cream">{cert.name}</p>
          <p className="text-xs text-cream-faint">{cert.dailyLimit} contracts/day</p>
        </div>
      </header>

      {/* contracts */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-cream">Today’s contracts</h2>
        <ResetCountdown className="text-xs text-cream-faint" label="Contracts reset in" />
      </div>
      <p className="mt-1 text-sm text-cream-dim">
        {cert.name === "Entry" && "Entry certification — two Standard runs, up to 1,400 LC each."}
        {cert.name === "Load Master" && "Load Master — three contracts mixing Standard and Perishable freight."}
        {cert.name === "Freight Architect" && "Freight Architect — includes a Specialized high-risk / high-reward load (×1.3 on 5,500 LC, or a 20% deduction)."}
      </p>
      <div className="mt-3">
        <CargoDispatch legs={legs} />
      </div>

      {/* references */}
      <section className="mt-9 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h3 className="font-display text-base font-semibold text-cream">Risk &amp; reward</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(["low", "medium", "high"] as const).map((r) => (
              <li key={r} className="flex items-center justify-between border-t border-obsidian/60 pt-2">
                <span className="text-cream-dim">{CARGO_TABLE[r].label} · ×{CARGO_TABLE[r].multiplier}</span>
                <span className="text-cream-faint">◆ {CARGO_TABLE[r].net.toLocaleString()} LC{CARGO_TABLE[r].deduction > 0 ? ` (−${CARGO_TABLE[r].deduction * 100}%)` : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-faint">Higher risk and longer flights carry higher potential rewards. High-risk loads are subject to a 20% deduction.</p>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h3 className="font-display text-base font-semibold text-cream">Cargo progression</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {CARGO_CERTS.map((c) => (
              <li key={c.name} className="flex items-start justify-between gap-3 border-t border-obsidian/60 pt-2">
                <div>
                  <span className={`font-semibold ${c.name === cert.name ? "text-rose" : "text-cream"}`}>{c.name}</span>
                  <span className="text-xs text-cream-faint"> · {c.hours === 0 ? "starting" : `${c.hours}h`}{c.lcReq > 0 ? ` + ${c.lcReq.toLocaleString()} LC` : ""}</span>
                  <p className="text-xs text-cream-faint">{c.dailyLimit} contracts/day</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-faint">Plus periodic “Delivery Ferry” assignments — high-yield aircraft deliveries from the manufacturer.</p>
        </div>
      </section>

      {/* cargo codeshares */}
      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-cream">Cargo codeshares</h3>
          <span className="text-xs text-cream-faint">{codeshareUnlocked ? "Available ✓" : "Unlocks at Freight Architect"}</span>
        </div>
        <p className="mb-3 mt-1 text-sm text-cream-dim">Jet Airways is free for all cargo pilots. Purchase more freight networks with Logistic Coins — priced low to high.</p>
        <CodeshareInventory items={cargoCodeshares} currency="LC" owned={d.unlockedCodeshares} balance={d.lcBalance} />
      </section>
    </div>
  );
}
