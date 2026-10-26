import { getPilotDashboard, fmtHours } from "@/lib/portal";
import { getDispatches } from "@/lib/ops";
import { getOpsConfig } from "@/lib/opsStore";
import { AP_TABLE, LICENSES, CAREER_CODESHARES, CODESHARE_UNLOCK_AP, punctualityBonus, type Codeshare } from "@/lib/career";
import { airportCity } from "@/lib/airports";
import { fileableAircraftFor } from "@/lib/aircraft";
import { Locked } from "@/components/portal/Locked";
import { CareerDispatch, type CareerLeg } from "@/components/portal/CareerDispatch";
import { CodeshareInventory } from "@/components/portal/CodeshareInventory";
import { PurchaseButton } from "@/components/portal/PurchaseButton";
import { ResetCountdown } from "@/components/portal/ResetCountdown";

export const metadata = { title: "Career Mode" };
export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const d = await getPilotDashboard();
  if (!d) return null;
  if (!d.gates.career) {
    return <Locked title="Career Mode" rank="Elysian" hours={150} current={d.totalHours} blurb="Auto-dispatched assignments, the Strait-Points economy and licence progression open up once you reach Elysian." />;
  }

  const opsCfg = await getOpsConfig();
  const careerCodeshares: Codeshare[] = [
    ...CAREER_CODESHARES,
    ...opsCfg.networks.filter((n) => n.type === "career").map((n) => ({ name: n.name, cost: n.price, free: n.price === 0 })),
  ];

  const bonus = punctualityBonus(d.license.current.short);
  const board = getDispatches(d.session.pilotId, { authorizedFleet: d.fleet, punctualBonus: bonus, allowedHauls: d.allowedHauls });
  const legs: CareerLeg[] = board.map((dp) => ({
    id: dp.id, dep: dp.dep, arr: dp.arr, depCity: airportCity(dp.dep), arrCity: airportCity(dp.arr),
    flightNo: dp.flightNo, aircraft: fileableAircraftFor({ aircraft: dp.aircraft, airline: dp.airline }),
    aircraftLabel: dp.aircraft.replace(/^Xiamen Air |^Coastal Regional /, ""),
    timeLabel: fmtHours(dp.minutes), haul: dp.haul, spotlight: dp.spotlight,
    potentialAp: dp.potentialAp, punctualBonus: dp.punctualBonus, windowMinutes: dp.windowMinutes,
  }));
  const ultra = legs.length === 1 && legs[0].haul === "Ultra";

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Career Track</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Career Mode</h1>
          <p className="mt-2 max-w-xl text-cream-dim">Accept an assignment to see its flight summary, potential payout and a completion timer (flight time + 2h). File on time for a flat licence bonus; spotlight sectors pay 2×.</p>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-wide text-cream-faint">Licence</p>
          <p className="font-display text-xl font-semibold text-cream">{d.license.current.short}</p>
          <p className="text-xs text-cream-faint">{d.fleet.length} aircraft authorised</p>
        </div>
      </header>

      {/* dispatch board */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-cream">Dispatch board</h2>
        <ResetCountdown className="text-xs text-cream-faint" />
      </div>
      {ultra && (
        <p className="mt-2 rounded-xl border border-rose/30 bg-rose/[0.05] px-4 py-2.5 text-sm text-cream-dim">
          <span className="font-semibold text-rose">Ultra-long-haul day.</span> Today&apos;s roster is a single sector — no other flights are dispatched, and it carries the new Ultra-long-haul payout.
        </p>
      )}
      <div className="mt-3">
        <CareerDispatch legs={legs} />
      </div>

      {/* references */}
      <section className="mt-9 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h3 className="font-display text-base font-semibold text-cream">AP payout by flight time</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(["regional", "continental", "longhaul", "ultralong"] as const).map((c) => (
              <li key={c} className="flex items-center justify-between border-t border-obsidian/60 pt-2">
                <span className="text-cream-dim">{AP_TABLE[c].label}</span>
                <span className="font-semibold text-cream">✦ {AP_TABLE[c].net.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-faint">Filing on time adds a flat haul-based bonus — Medium +50, Long +100, Ultra +150 AP (short-haul has none). Spotlight sectors pay 2×. Your licence: <span className="text-cream-dim">{d.license.current.short}</span>.</p>
        </div>
        <div className="rounded-2xl border border-obsidian bg-ink-900 p-6">
          <h3 className="font-display text-base font-semibold text-cream">Licences (purchased with AP)</h3>
          <p className="mt-1 text-xs text-cream-faint">Buy in order — each unlocks its haul on your career dispatch. Balance: <span className="text-cream-dim">✦ {d.apBalance.toLocaleString()} AP</span></p>
          <ul className="mt-3 space-y-2 text-sm">
            {LICENSES.map((l, i) => {
              const owned = d.ownedLicenses.includes(l.short);
              const prevOwned = i === 0 || d.ownedLicenses.includes(LICENSES[i - 1].short);
              const haul = i === 0 ? "short-haul" : i === 1 ? "+ medium-haul" : "+ long & ultra";
              return (
                <li key={l.short} className="flex items-center justify-between gap-3 border-t border-obsidian/60 pt-2">
                  <div><span className={`font-semibold ${owned ? "text-cream" : "text-cream-faint"}`}>{l.name}</span> <span className="text-xs text-cream-faint">· {l.apCost.toLocaleString()} AP · {haul}</span></div>
                  {owned ? (
                    <span className="text-xs font-semibold text-gold">Owned ✓</span>
                  ) : (
                    <PurchaseButton kind="license" item={l.short} cost={l.apCost} currency="AP" canAfford={d.apBalance >= l.apCost} locked={!prevOwned} lockedLabel={`${LICENSES[i - 1]?.short} first`} label="Buy" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* codeshare inventory */}
      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-cream">Codeshare networks</h3>
          <span className="text-xs text-cream-faint">{d.apBalance >= CODESHARE_UNLOCK_AP ? "Codeshares unlocked ✓" : `${CODESHARE_UNLOCK_AP.toLocaleString()} AP to initiate`}</span>
        </div>
        <p className="mb-3 mt-1 text-sm text-cream-dim">Jet Airways is free for all pilots. Unlock more passenger partners with Strait Points — priced low to high.</p>
        <CodeshareInventory items={careerCodeshares} currency="AP" owned={d.unlockedCodeshares} balance={d.apBalance} />
      </section>
    </div>
  );
}
