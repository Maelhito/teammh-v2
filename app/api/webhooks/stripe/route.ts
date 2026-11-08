import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getTtlStripeOffers } from "@/lib/ttl-stripe-offers";
import { synchroniserTtlVersNotion } from "@/lib/notion-ttl";
import { resumeResiliation, type TtlResiliation } from "@/lib/ttl-resiliation";

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

const STATUTS_ACTIFS = new Set(["active", "trialing"]);

/** Produits Stripe des prix TTL configurés — lus une fois par instance. */
let produitsTtl: Promise<Set<string>> | null = null;

function chargerProduitsTtl(stripe: Stripe): Promise<Set<string>> {
  produitsTtl ??= Promise.all(
    getTtlStripeOffers()
      .map((o) => o.priceId)
      .filter((id): id is string => !!id)
      .map((id) => stripe.prices.retrieve(id).then((p) => String(typeof p.product === "string" ? p.product : p.product.id)).catch(() => null))
  ).then((ids) => {
    const set = new Set(ids.filter((id): id is string => !!id));
    // Échec de lecture : on retentera au prochain événement plutôt que de
    // mémoriser « aucun produit TTL ».
    if (!set.size) produitsTtl = null;
    return set;
  });
  return produitsTtl;
}

/**
 * Cet abonnement est-il un abonnement TTL ?
 *
 * Oui s'il vient de nos tunnels (métadonnée `offer_slug`), ou si l'un de ses
 * prix est un prix TTL — ou appartient au même produit Stripe qu'un prix TTL.
 * Le produit couvre les abonnements créés à la main par le coach et les
 * anciens tarifs : changer le prix ne change pas le produit.
 */
async function estAbonnementTtl(stripe: Stripe, subscription: Stripe.Subscription): Promise<boolean> {
  if (subscription.metadata?.offer_slug) return true;

  const prixTtl = new Set(getTtlStripeOffers().map((o) => o.priceId).filter(Boolean));
  const items = subscription.items?.data ?? [];
  if (items.some((i) => prixTtl.has(i.price?.id))) return true;

  const produits = await chargerProduitsTtl(stripe);
  return items.some((i) => {
    const produit = i.price?.product;
    if (!produit) return false;
    return produits.has(typeof produit === "string" ? produit : produit.id);
  });
}

const STATUTS_TERMINES = new Set(["canceled", "unpaid", "incomplete_expired"]);

/**
 * Suivi de la durée : début et fin réels de l'abonnement.
 *
 * Séparé de l'upsert principal exprès : tant que sql/ttl_suivi_abonnements.sql
 * n'est pas passé, les colonnes n'existent pas et cet appel échoue en silence,
 * sans jamais empêcher l'accès de la cliente d'être mis à jour.
 */
async function enregistrerDatesSuivi(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  try {
    const { data: ligne, error } = await admin
      .from("ttl_subscriptions")
      .select("stripe_subscription_id, started_at")
      .eq("user_id", userId)
      .maybeSingle();
    // Une autre ligne (ancien abonnement) ne doit pas toucher aux dates de l'actuel.
    if (error || !ligne || ligne.stripe_subscription_id !== subscription.id) return;

    const maj: Record<string, unknown> = {
      cancel_at_period_end: !!subscription.cancel_at_period_end,
    };
    if (!ligne.started_at && subscription.start_date) {
      maj.started_at = new Date(subscription.start_date * 1000).toISOString();
    }
    if (STATUTS_TERMINES.has(subscription.status)) {
      const fin = subscription.ended_at ?? subscription.canceled_at;
      maj.ended_at = fin ? new Date(fin * 1000).toISOString() : new Date().toISOString();
    } else if (STATUTS_ACTIFS.has(subscription.status)) {
      // Elle est revenue (ou le paiement est passé) : plus d'arrêt.
      maj.ended_at = null;
    }

    const { error: erreurMaj } = await admin.from("ttl_subscriptions").update(maj).eq("user_id", userId);
    if (erreurMaj) return;

    // Miroir dans Notion (jamais bloquant : la fonction ne lève pas d'erreur).
    const { data: user } = await admin.auth.admin.getUserById(userId);

    // Pourquoi elle part : sa dernière réponse au questionnaire d'arrêt, s'il y en a une.
    let motif: string | null = null;
    if (STATUTS_TERMINES.has(subscription.status)) {
      const { data: rep } = await admin
        .from("ttl_resiliations")
        .select("motifs, satisfaction, commentaire, reviendrait")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rep) motif = resumeResiliation(rep as TtlResiliation) || null;
    }

    await synchroniserTtlVersNotion({
      motif,
      email: user?.user?.email,
      actif: !STATUTS_TERMINES.has(subscription.status),
      debut: (maj.started_at as string | undefined) ?? (ligne.started_at as string | null),
      fin: (maj.ended_at as string | null | undefined) ?? null,
    });
  } catch {
    // Migration pas encore passée : on ignore.
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
      // Seuls nos tunnels TTL posent `offer_slug` : tout autre paiement (TTM,
      // lien de paiement…) n'a rien à faire dans ttl_subscriptions.
      if (session.mode !== "subscription" || !session.metadata?.offer_slug) break;
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
      // Les abonnements TTM passent aussi par ce webhook : sans ce filtre, ils
      // étaient rangés comme abonnements TTL (repêchage par email), et la
      // résiliation de l'ancien abonnement TTM d'une cliente passée en TTL lui
      // fermait l'accès TTL.
      if (!(await estAbonnementTtl(stripe, subscription))) break;
      const customerId = String(subscription.customer);
      const userId = await trouverUserId(admin, stripe, customerId, subscription.metadata?.user_id);
      if (!userId) break;

      // Une seule ligne par cliente : un vieil abonnement qui se termine ne doit
      // pas écraser celui, différent, qui la fait vivre aujourd'hui.
      const { data: actuel } = await admin
        .from("ttl_subscriptions")
        .select("stripe_subscription_id, status")
        .eq("user_id", userId)
        .maybeSingle();
      if (
        actuel?.stripe_subscription_id &&
        actuel.stripe_subscription_id !== subscription.id &&
        STATUTS_ACTIFS.has(actuel.status) &&
        !STATUTS_ACTIFS.has(subscription.status)
      ) break;

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

      await enregistrerDatesSuivi(admin, userId, subscription);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
