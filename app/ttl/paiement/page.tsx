import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess, accesTtlAccorde } from "@/lib/ttl-access";
import { getTtlStripeOffers } from "@/lib/ttl-stripe-offers";
import { getTtlSubscription } from "@/lib/ttl";
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

  const offre = await requireTtlAccess(userId, isPreview, { skipSubscriptionCheck: true });

  // Rien à payer ici si l'accès est déjà ouvert — que ce soit parce que le coach
  // a offert l'offre, ou parce qu'un abonnement est actif. Ce second cas évite
  // aussi un double abonnement Stripe (deux souscriptions sur le même customer,
  // double débit mensuel). La règle est la même que celle qui garde /ttl : deux
  // règles différentes, et les deux pages se renvoyaient la balle en boucle.
  if (!isPreview) {
    const abonnement = userId ? await getTtlSubscription(userId) : null;
    if (accesTtlAccorde(offre, abonnement)) {
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
