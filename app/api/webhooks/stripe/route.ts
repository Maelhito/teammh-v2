import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * À quelle cliente appartient cet abonnement ?
 *
 * Trois pistes, de la plus sûre à la plus tolérante. La troisième existe pour
 * un cas précis : le coach crée l'abonnement À LA MAIN dans Stripe, sur la
 * carte déjà enregistrée d'une cliente TTM qui passe en TTL. Cet abonnement-là
 * ne porte aucune métadonnée — sans repêchage par email, il ne serait rattaché
 * à personne, et la cliente ne pourrait jamais le résilier depuis l'app.
 */
async function trouverUserId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  stripe: Stripe,
  customerId: string,
  metadataUserId: string | undefined
): Promise<string | null> {
  // 1. Notre propre tunnel de paiement pose la métadonnée.
  if (metadataUserId) return metadataUserId;

  // 2. Ce client Stripe est déjà rattaché à quelqu'un.
  const { data: connu } = await admin
    .from("ttl_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (connu?.user_id) return connu.user_id as string;

  // 3. Dernier recours : l'email du client Stripe. Les webhooks d'abonnement
  //    sont rares (quelques-uns par cliente et par an), le coût d'une liste
  //    complète est sans importance ici.
  try {
    const client = await stripe.customers.retrieve(customerId);
    const email = (client as Stripe.Customer).email?.toLowerCase();
    if (!email) return null;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=500`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const users: { id: string; email?: string }[] = json.users ?? json ?? [];
    return users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.user_id;
      if (!userId || !session.customer) break;
      await admin.from("ttl_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: String(session.customer),
        stripe_subscription_id: session.subscription ? String(session.subscription) : null,
        offer_slug: session.metadata?.offer_slug ?? null,
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }
    // `created` compte autant que les deux autres : un abonnement créé à la
    // main dans le tableau de bord Stripe n'émet que celui-là, et sans lui la
    // cliente n'avait aucun abonnement du point de vue de l'app.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = String(subscription.customer);
      const userId = await trouverUserId(admin, stripe, customerId, subscription.metadata?.user_id);
      if (!userId) break;
      await admin.from("ttl_subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.items?.data?.[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
