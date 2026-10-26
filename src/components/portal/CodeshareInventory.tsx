import Link from "next/link";
import type { Codeshare } from "@/lib/career";
import { sortedCodeshares } from "@/lib/career";
import { PurchaseButton } from "./PurchaseButton";

/* Codeshare partners as an unlockable inventory — Jet Airways is the free
   starter (unlocked); the rest are locked with a price, shown ascending.
   Passenger partners are priced in AP, cargo partners in LC. Buying one debits
   the wallet and its routes become browsable + start appearing on dispatch. */
export function CodeshareInventory({
  items,
  currency,
  owned = [],
  balance = 0,
  routesHref = "/crew/routes",
}: {
  items: Codeshare[];
  currency: "AP" | "LC";
  owned?: string[];
  balance?: number;
  routesHref?: string;
}) {
  const sorted = sortedCodeshares(items);
  const icon = currency === "AP" ? "✦" : "◈";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((c) => {
        const unlocked = !!c.free || owned.includes(c.name);
        return (
          <div
            key={c.name}
            className={`flex flex-col gap-2 rounded-2xl border p-4 ${unlocked ? "border-gold/40 bg-gold/[0.05]" : "border-obsidian bg-ink-900"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-cream">{c.name}</p>
                <p className="text-xs text-cream-faint">{unlocked ? (c.free ? "Free starter · all pilots" : "Unlocked ✓") : "Partner network"}</p>
              </div>
              {unlocked ? (
                <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-gold">Unlocked</span>
              ) : (
                <PurchaseButton kind="codeshare" item={c.name} cost={c.cost} currency={currency} canAfford={balance >= c.cost} label={`Unlock ${icon}`} />
              )}
            </div>
            {unlocked && (
              <Link href={`${routesHref}?airline=${encodeURIComponent(c.name)}`} className="text-xs font-medium text-gold-soft hover:text-cream">
                View routes in database →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
