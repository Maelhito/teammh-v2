import Stripe from "stripe";

// Un module server peut être instancié plusieurs fois selon la route (Next.js
// compile chaque route à la demande en dev). On ne mémorise donc jamais une
// absence de clé : sinon un module démarré avant que .env.local soit chargé
// restait bloqué sur "pas de Stripe" pour toute sa durée de vie.
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  cached = new Stripe(secretKey);
  return cached;
}
