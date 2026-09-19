import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { creerCompteTtl } from "@/lib/ttl-inscription";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Paiement non configuré" }, { status: 500 });

  const { sessionId, password } = await request.json();
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Session de paiement introuvable." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  } catch {
    return NextResponse.json({ error: "Session de paiement introuvable." }, { status: 404 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Le paiement n'a pas été confirmé." }, { status: 400 });
  }

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) {
    return NextResponse.json({ error: "Email introuvable sur ce paiement." }, { status: 400 });
  }

  const meta = session.metadata ?? {};
  const sub = typeof session.subscription === "object" ? session.subscription : null;

  const resultat = await creerCompteTtl(
    {
      prenom: meta.prenom || "",
      nom: meta.nom || "",
      email,
      password,
      poids: meta.poids ? Number(meta.poids) : null,
      poidsVise: meta.poidsVise ? Number(meta.poidsVise) : null,
      frein: meta.frein || null,
      pretADemarrer: meta.pretADemarrer === "true" ? true : meta.pretADemarrer === "false" ? false : null,
      timezone: meta.timezone || null,
    },
    {
      stripeCustomerId: String(session.customer),
      stripeSubscriptionId: sub?.id ?? null,
      offerSlug: meta.offer_slug || "standard",
      status: sub?.status ?? "active",
      currentPeriodEnd: sub?.items?.data?.[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
        : null,
    }
  );

  if ("error" in resultat) {
    return NextResponse.json({ error: resultat.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, email }, { status: 201 });
}
