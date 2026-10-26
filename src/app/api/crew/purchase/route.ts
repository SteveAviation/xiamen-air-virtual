import { getSession } from "@/lib/auth";
import { recordPurchase, createNotification } from "@/lib/db";
import { getPilotEconomy } from "@/lib/portal";
import { LICENSES, CAREER_CODESHARES, CARGO_CODESHARES } from "@/lib/career";
import { getOpsConfig } from "@/lib/opsStore";

export const dynamic = "force-dynamic";

/* Buy a career licence or unlock a codeshare network. AP/LC is validated
   server-side against the pilot's live balance, then debited by recording the
   purchase in the ledger. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = String(body.kind ?? "");
  const item = String(body.item ?? "").trim();

  const econ = await getPilotEconomy(session.pilotId);
  const owned = econ.license.owned;

  let cost = 0;
  let currency: "AP" | "LC" = "AP";

  if (kind === "license") {
    const lic = LICENSES.find((l) => l.short === item);
    if (!lic) return Response.json({ error: "Unknown licence." }, { status: 400 });
    if (owned.includes(item)) return Response.json({ error: "Already owned." }, { status: 409 });
    // Enforce sequential progression: must own the previous licence first.
    const idx = LICENSES.findIndex((l) => l.short === item);
    if (idx > 0 && !owned.includes(LICENSES[idx - 1].short)) {
      return Response.json({ error: `Unlock the ${LICENSES[idx - 1].short} first.` }, { status: 409 });
    }
    cost = lic.apCost;
    currency = "AP";
  } else if (kind === "codeshare") {
    const pax = CAREER_CODESHARES.find((c) => c.name === item);
    const frt = CARGO_CODESHARES.find((c) => c.name === item);
    const staff = (await getOpsConfig()).networks.find((n) => n.name === item);
    if (staff) {
      cost = staff.price;
      currency = staff.currency;
    } else {
      const cs = pax ?? frt;
      if (!cs) return Response.json({ error: "Unknown codeshare." }, { status: 400 });
      if (cs.free) return Response.json({ error: "That network is already free to fly." }, { status: 409 });
      cost = cs.cost;
      currency = pax ? "AP" : "LC";
    }
  } else {
    return Response.json({ error: "Unknown purchase kind." }, { status: 400 });
  }

  const balance = currency === "AP" ? econ.apBalance : econ.lcBalance;
  if (balance < cost) {
    return Response.json(
      { error: `Not enough ${currency} — need ${cost.toLocaleString()}, you have ${Math.max(0, balance).toLocaleString()}.` },
      { status: 402 },
    );
  }

  const res = await recordPurchase({ pilotId: session.pilotId, kind: kind as "license" | "codeshare", item, cost, currency });
  if (!res.ok) return Response.json({ error: res.error }, { status: 409 });

  await createNotification({
    pilotId: session.pilotId,
    kind: "unlock",
    title: kind === "license" ? `${item} licence unlocked` : `${item} codeshare unlocked`,
    body: `−${cost.toLocaleString()} ${currency} debited from your wallet.`,
  }).catch(() => {});

  return Response.json({ ok: true, spent: cost, currency, balance: balance - cost });
}
