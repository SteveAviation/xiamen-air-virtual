import { StatsBoard } from "@/components/StatsBoard";

export const dynamic = "force-dynamic";

export default function CrewStats() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <h2 className="font-display text-2xl font-semibold text-cream">
        Pilot stats
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-cream-dim">
        Configurable standings — switch the timeline (this week, this month or
        all-time) and compare credited hours (with event multipliers) against
        raw flown hours.
      </p>

      <div className="mt-8">
        <StatsBoard metricToggle initialRange="month" />
      </div>
    </section>
  );
}
