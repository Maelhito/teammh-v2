import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getTtlStripeOffer } from "@/lib/ttl-stripe-offers";

/**
 * Lance le paiement AVANT tout compte : la cliente n'existe pas encore côté
 * Supabase, seulement dans les métadonnées de la session Stripe. Le compte
 * n'est créé qu'après paiement confirmé, par /api/inscription-ttl/finaliser —
 * voir lib/ttl-inscription.ts pour le pourquoi.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Paiement non configuré" }, { status: 500 });

  const offerConfig = getTtlStripeOffer("standard");
  if (!offerConfig?.priceId) {
    return NextResponse.json({ error: "Offre non configurée" }, { status: 500 });
  }

  const body = await request.json();
  const { prenom, nom, email, poids, poidsVise, frein, pretADemarrer, timezone } = body;

  if (!prenom || typeof prenom !== "string" || !email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Prénom et email requis." }, { status: 400 });
  }

  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: offerConfig.priceId, quantity: 1 }],
      success_url: `${origin}/ttl/bienvenue?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/inscription-ttl?checkout=canceled`,
      // Metadata en strings uniquement (contrainte Stripe) — reconverties par
      // /api/inscription-ttl/finaliser une fois le paiement confirmé.
      metadata: {
        prenom: String(prenom).slice(0, 100),
        nom: nom ? String(nom).slice(0, 100) : "",
        poids: typeof poids === "number" ? String(poids) : "",
        poidsVise: typeof poidsVise === "number" ? String(poidsVise) : "",
        frein: frein ? String(frein).slice(0, 500) : "",
        pretADemarrer: typeof pretADemarrer === "boolean" ? String(pretADemarrer) : "",
        timezone: timezone ? String(timezone).slice(0, 100) : "",
        offer_slug: "standard",
      },
      subscription_data: { metadata: { offer_slug: "standard" } },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur Stripe" }, { status: 500 });
  }
}
