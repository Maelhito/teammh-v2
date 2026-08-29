import { redirect } from "next/navigation";
import { getOffreCliente, getTtlSubscription, isTtlSubscriptionActive, type OffreCliente } from "@/lib/ttl";

interface RequireTtlAccessOptions {
  skipSubscriptionCheck?: boolean;
}

/**
 * Vérifie que l'utilisateur a bien l'offre TTL, et — seulement s'il s'est
 * inscrit lui-même — qu'il a un abonnement Stripe actif.
 *
 * Une offre attribuée depuis l'Admin (`paiement_requis` à false) ouvre l'accès
 * immédiatement : c'est le choix du coach, pas une vente en ligne. Sans cette
 * distinction, toute cliente basculée en TTL depuis l'Admin atterrissait sur la
 * page de paiement et n'en sortait jamais.
 *
 * Redirige vers /dashboard (mauvaise offre) ou /ttl/paiement (pas d'abonnement).
 * Désactivé en dev pour permettre de tester sans compte Stripe réel.
 */
export async function requireTtlAccess(
  userId: string,
  isPreview: boolean,
  opts: RequireTtlAccessOptions = {}
): Promise<OffreCliente | null> {
  const isDev = process.env.NODE_ENV === "development";
  const offre = userId ? await getOffreCliente(userId) : null;

  if (!isDev && offre?.offre !== "TTL") {
    redirect("/dashboard");
  }

  if (!isDev && !isPreview && !opts.skipSubscriptionCheck && offre?.paiement_requis) {
    const subscription = userId ? await getTtlSubscription(userId) : null;
    if (!isTtlSubscriptionActive(subscription)) {
      redirect("/ttl/paiement");
    }
  }

  return offre;
}
