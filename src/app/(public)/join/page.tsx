import Link from "next/link";
import { APPLY } from "@/lib/data";
import { ApplyForms } from "@/components/public/ApplyForms";

export const metadata = { title: "Apply" };

const STEPS = [
  { n: 1, title: "Submit your application", body: "Pick Pilot or Staff and answer a few short questions — right here on the site." },
  { n: 2, title: "Staff review", body: "Our recruitment team reviews your application and reaches out via the Infinite Flight Community." },
  { n: 3, title: "Onboarding on Discord", body: "Accepted applicants get a Discord invite, a callsign, and start flying as a Horizon pilot." },
];

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-20">
      <header className="reveal text-center">
        <p className="eyebrow">Join the airline</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-cream lg:text-5xl">Your career starts at Horizon.</h1>
        <p className="lead mx-auto mt-4 max-w-2xl text-cream-dim">Apply to fly with Xiamen Air Virtual, or join the team behind it. Applications are handled right here — no forms to chase. Tell us about yourself and our staff will follow up on the IFC to begin onboarding.</p>
      </header>

      {/* Steps */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="rise rounded-xl border border-obsidian bg-ink-900 p-6 lift" style={{ animationDelay: `${s.n * 70}ms` }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-sm font-semibold text-white">{s.n}</span>
            <h3 className="mt-3 font-display text-base font-semibold text-cream">{s.title}</h3>
            <p className="mt-1 text-sm text-cream-dim">{s.body}</p>
          </div>
        ))}
      </section>

      {/* Requirements — shown before the form so applicants can self-check */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">Before you apply</h2>
        <p className="mt-1 text-sm text-cream-dim">Make sure you meet the requirements for your track.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-obsidian bg-ink-900 p-7">
            <h3 className="font-display text-lg font-semibold text-cream">Pilot requirements</h3>
            <ul className="mt-4 grid gap-2.5">
              {APPLY.pilot.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-cream-dim"><span className="mt-0.5 text-gold-soft">✓</span>{r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-obsidian bg-ink-900 p-7">
            <h3 className="font-display text-lg font-semibold text-cream">Staff requirements</h3>
            <ul className="mt-4 grid gap-2.5">
              {APPLY.staff.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-cream-dim"><span className="mt-0.5 text-gold-soft">✓</span>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Application forms */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-cream">Apply now</h2>
        <p className="mt-1 text-sm text-cream-dim">Choose your track and fill in the details below.</p>
        <div className="mt-5"><ApplyForms /></div>
      </section>

      <p className="mt-8 text-center text-sm text-cream-dim">Already a pilot? Head to the <Link href="/crew" className="text-gold-soft hover:underline">Crew Centre</Link>.</p>
    </div>
  );
}
