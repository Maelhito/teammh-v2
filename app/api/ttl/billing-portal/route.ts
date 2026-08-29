import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { getTtlSubscription } from "@/lib/ttl";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Paiement non configuré" }, { status: 500 });

  const sub = await getTtlSubscription(user.id);
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: "Aucun abonnement trouvé" }, { status: 404 });

  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/ttl/profil`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur Stripe" }, { status: 500 });
  }
}
