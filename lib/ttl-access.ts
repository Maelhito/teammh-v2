import { redirect } from "next/navigation";
import { getOffreCliente, getTtlSubscription, isTtlSubscriptionActive, type OffreCliente } from "@/lib/ttl";

interface RequireTtlAccessOptions {
  skipSubscriptionCheck?: boolean;
}

/**
 * Vérifie que l'utilisateur a l'offre TTL et un abonnement Stripe actif.
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

  if (!isDev && !isPreview && !opts.skipSubscriptionCheck) {
    const subscription = userId ? await getTtlSubscription(userId) : null;
    if (!isTtlSubscriptionActive(subscription)) {
      redirect("/ttl/paiement");
    }
  }

  return offre;
}
