import { redirect } from "next/navigation";
import {
  getOffreCliente,
  getTtlSubscription,
  isTtlSubscriptionActive,
  type OffreCliente,
  type TtlSubscription,
} from "@/lib/ttl";

/**
 * LA règle d'accès à TTL, en un seul endroit — la page de paiement s'appuie sur
 * la même, sans quoi les deux se renvoyaient la balle en boucle.
 *
 * Un abonnement, QUELLE QUE SOIT SON ORIGINE, fait foi. Y compris celui que le
 * coach crée à la main dans Stripe sur la carte déjà enregistrée d'une cliente
 * TTM : le jour où elle le résilie depuis l'app, son accès s'arrête à la fin de
 * la période payée, comme pour n'importe quel abonnement.
 *
 * Sans aucun abonnement, seule une inscription publique reste à la porte : une
 * offre attribuée depuis l'Admin est un accès offert, c'est la décision du
 * coach.
 */
export function accesTtlAccorde(
  offre: OffreCliente | null,
  abonnement: TtlSubscription | null
): boolean {
  if (!offre) return false;
  if (abonnement) return isTtlSubscriptionActive(abonnement);
  return !offre.paiement_requis;
}

interface RequireTtlAccessOptions {
  skipSubscriptionCheck?: boolean;
}

/**
 * Vérifie que l'utilisateur a bien l'offre TTL et qu'il y a droit
 * (voir `accesTtlAccorde`).
 *
 * Redirige vers /dashboard (mauvaise offre) ou /ttl/paiement (accès fermé).
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
    const abonnement = userId ? await getTtlSubscription(userId) : null;
    if (!accesTtlAccorde(offre, abonnement)) {
      redirect("/ttl/paiement");
    }
  }

  return offre;
}
