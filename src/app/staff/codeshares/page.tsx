import { getOpsConfig } from "@/lib/opsStore";
import { PARTNERS } from "@/lib/data";
import { ROUTES } from "@/lib/routes";
import { airportCity } from "@/lib/airports";
import { firstFlightNo } from "@/lib/ops";
import { CodeshareManager } from "@/components/CodeshareManager";
import { NetworkManager } from "@/components/NetworkManager";
import { XiamenRouteEditor } from "@/components/XiamenRouteEditor";

export const dynamic = "force-dynamic";

export default async function CrewCodesharesPage() {
  const cfg = await getOpsConfig();
  const partners = PARTNERS.map((p) => p.name.replace(/ Virtual$/, ""));

  const xiamenairRows = ROUTES.filter((r) => r.airline === "Xiamen Air Virtual").map((r) => ({
    routeNumber: r.routeNumber,
    label: `${firstFlightNo(r)} · ${airportCity(r.dep)} → ${airportCity(r.arr)}`,
    discontinued: cfg.discontinued.includes(r.routeNumber),
    rename: cfg.renames[r.routeNumber] ?? "",
  }));

  return (
    <section className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <h2 className="font-display text-2xl font-semibold text-cream">Network management</h2>
      <p className="mt-1 text-sm text-cream-dim">Create unlockable codeshare networks, add their routes, and edit the base Xiamen Air network.</p>

      {/* Unlockable networks */}
      <div className="mt-8">
        <NetworkManager networks={cfg.networks} />
      </div>

      {/* Codeshare routes */}
      <div className="mt-10 border-t border-obsidian/60 pt-8">
        <CodeshareManager routes={cfg.codeshares} partners={partners} />
      </div>

      {/* Xiamen Air route editor */}
      <div className="mt-10 border-t border-obsidian/60 pt-8">
        <h3 className="font-display text-xl font-semibold text-cream">Xiamen Air network</h3>
        <p className="mb-4 mt-1 text-sm text-cream-dim">Change a route&apos;s flight number or discontinue it. Overrides apply across the route database instantly.</p>
        <XiamenRouteEditor routes={xiamenairRows} />
      </div>
    </section>
  );
}
