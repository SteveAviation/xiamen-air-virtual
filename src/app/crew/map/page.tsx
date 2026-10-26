import { LiveGlobe } from "@/components/portal/LiveGlobe";
import { networkLegs, HUB_COORDS, HUB_ICAO, hubCity } from "@/lib/network";

export const metadata = { title: "Live Map" };
export const dynamic = "force-dynamic";

/* Brand colours for the three.js layers must be plain hex — three-globe cannot
   parse the oklch() our CSS design tokens use. See LiveGlobe's withAlpha(). */
const ACCENT = "#3B6FE0";
const ACCENT_SOFT = "#8FB0F6";
const BACKDROP = "radial-gradient(ellipse at 50% 40%, #1a1147 0%, #0a0524 70%)";

export default function MapPage() {
  const legs = networkLegs();

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <header className="rise mb-5">
        <p className="eyebrow">Operations</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream">Live map</h1>
        <p className="mt-2 max-w-2xl text-cream-dim">
          Live Infinite Flight traffic across the network, in real time. Drag to rotate, scroll to
          zoom, and click an aircraft for its flight card.
        </p>
      </header>

      <div className="rise">
        <LiveGlobe
          legs={legs}
          hub={HUB_COORDS}
          hubLabel={`${hubCity()} (${HUB_ICAO})`}
          accent={ACCENT}
          accentSoft={ACCENT_SOFT}
          backdrop={BACKDROP}
        />
      </div>
    </div>
  );
}
