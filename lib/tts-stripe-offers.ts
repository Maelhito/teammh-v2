export interface TtsStripeOffer {
  slug: string;
  label: string;
  priceId: string | null;
}

const OFFERS_CONFIG: { slug: string; label: string; envVar: string }[] = [
  { slug: "standard", label: "Offre standard", envVar: "STRIPE_PRICE_TTS_STANDARD" },
  { slug: "relance", label: "Offre de relance", envVar: "STRIPE_PRICE_TTS_RELANCE" },
];

export function getTtsStripeOffers(): TtsStripeOffer[] {
  return OFFERS_CONFIG.map((o) => ({
    slug: o.slug,
    label: o.label,
    priceId: process.env[o.envVar] || null,
  }));
}

export function getTtsStripeOffer(slug: string): TtsStripeOffer | null {
  return getTtsStripeOffers().find((o) => o.slug === slug) ?? null;
}
