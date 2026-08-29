export interface TtlStripeOffer {
  slug: string;
  label: string;
  priceId: string | null;
}

const OFFERS_CONFIG: { slug: string; label: string; envVar: string }[] = [
  { slug: "standard", label: "Offre standard", envVar: "STRIPE_PRICE_TTL_STANDARD" },
  { slug: "relance", label: "Offre de relance", envVar: "STRIPE_PRICE_TTL_RELANCE" },
];

export function getTtlStripeOffers(): TtlStripeOffer[] {
  return OFFERS_CONFIG.map((o) => ({
    slug: o.slug,
    label: o.label,
    priceId: process.env[o.envVar] || null,
  }));
}

export function getTtlStripeOffer(slug: string): TtlStripeOffer | null {
  return getTtlStripeOffers().find((o) => o.slug === slug) ?? null;
}
