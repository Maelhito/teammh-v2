import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getTtlStripeOffers } from "@/lib/ttl-stripe-offers";
import { getTtlSubscription, isTtlSubscriptionActive } from "@/lib/ttl";
import TtlHeader from "@/components/TtlHeader";
import PreviewBanner from "@/components/PreviewBanner";
import { ttlColors } from "@/lib/ttl-theme";
import TtlPaiementOffers from "./TtlPaiementOffers";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function TtlPaiementPage({ searchParams }: PageProps) {
  const { checkout } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtlAccess(userId, isPreview, { skipSubscriptionCheck: true });

  // Déjà abonnée : on ne montre jamais les offres, pour éviter un double abonnement
  // Stripe (deux souscriptions actives sur le même customer, double débit mensuel).
  if (!isPreview) {
    const subscription = userId ? await getTtlSubscription(userId) : null;
    if (isTtlSubscriptionActive(subscription)) {
      redirect("/ttl");
    }
  }

  const offers = getTtlStripeOffers().filter((o) => o.priceId);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 60 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Débloquer Time To Last" subtitle="Un dernier pas avant de commencer" />

        <div style={{ padding: "20px 20px 100px" }}>
          {checkout === "canceled" && (
            <div className="font-body" style={{ marginBottom: 16, background: ttlColors.card, border: "1px solid rgba(230,57,70,0.35)", borderRadius: 10, padding: "12px 16px" }}>
              <p style={{ fontSize: "0.8rem", color: ttlColors.redBright, margin: 0 }}>
                Paiement annulé — tu peux réessayer quand tu veux.
              </p>
            </div>
          )}

          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Ton compte est prêt. Choisis ton offre pour débloquer l&apos;onboarding, le programme sport, la nutrition et les capsules motivation.
          </p>

          {offers.length > 0 ? (
            <TtlPaiementOffers offers={offers} />
          ) : (
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13 }}>
              Aucune offre disponible pour l&apos;instant — reviens bientôt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
