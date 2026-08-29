import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { getTtlStripeOffer } from "@/lib/ttl-stripe-offers";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Paiement non configuré" }, { status: 500 });

  const { offer } = await request.json();
  const offerConfig = getTtlStripeOffer(offer);
  if (!offerConfig || !offerConfig.priceId) {
    return NextResponse.json({ error: "Offre invalide ou non configurée" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("ttl_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existing?.stripe_customer_id,
      customer_email: existing?.stripe_customer_id ? undefined : (user.email ?? undefined),
      line_items: [{ price: offerConfig.priceId, quantity: 1 }],
      success_url: `${origin}/ttl?checkout=success`,
      cancel_url: `${origin}/ttl/paiement?checkout=canceled`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, offer_slug: offer },
      subscription_data: { metadata: { user_id: user.id, offer_slug: offer } },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur Stripe" }, { status: 500 });
  }
}
