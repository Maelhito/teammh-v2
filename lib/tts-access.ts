import { redirect } from "next/navigation";
import { getOffreCliente, getTtsSubscription, isTtsSubscriptionActive, type OffreCliente } from "@/lib/tts";

interface RequireTtsAccessOptions {
  skipSubscriptionCheck?: boolean;
}

/**
 * Vérifie que l'utilisateur a l'offre TTS et un abonnement Stripe actif.
 * Redirige vers /dashboard (mauvaise offre) ou /tts/paiement (pas d'abonnement).
 * Désactivé en dev pour permettre de tester sans compte Stripe réel.
 */
export async function requireTtsAccess(
  userId: string,
  isPreview: boolean,
  opts: RequireTtsAccessOptions = {}
): Promise<OffreCliente | null> {
  const isDev = process.env.NODE_ENV === "development";
  const offre = userId ? await getOffreCliente(userId) : null;

  if (!isDev && offre?.offre !== "TTS") {
    redirect("/dashboard");
  }

  if (!isDev && !isPreview && !opts.skipSubscriptionCheck) {
    const subscription = userId ? await getTtsSubscription(userId) : null;
    if (!isTtsSubscriptionActive(subscription)) {
      redirect("/tts/paiement");
    }
  }

  return offre;
}
