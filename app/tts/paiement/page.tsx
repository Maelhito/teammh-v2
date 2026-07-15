import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtsAccess } from "@/lib/tts-access";
import { getTtsStripeOffers } from "@/lib/tts-stripe-offers";
import { getTtsSubscription, isTtsSubscriptionActive } from "@/lib/tts";
import TtsHeader from "@/components/TtsHeader";
import PreviewBanner from "@/components/PreviewBanner";
import { ttsColors } from "@/lib/tts-theme";
import TtsPaiementOffers from "./TtsPaiementOffers";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function TtsPaiementPage({ searchParams }: PageProps) {
  const { checkout } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtsAccess(userId, isPreview, { skipSubscriptionCheck: true });

  // Déjà abonnée : on ne montre jamais les offres, pour éviter un double abonnement
  // Stripe (deux souscriptions actives sur le même customer, double débit mensuel).
  if (!isPreview) {
    const subscription = userId ? await getTtsSubscription(userId) : null;
    if (isTtsSubscriptionActive(subscription)) {
      redirect("/tts");
    }
  }

  const offers = getTtsStripeOffers().filter((o) => o.priceId);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 60 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtsHeader variant="page" title="Débloquer Time To Start" subtitle="Un dernier pas avant de commencer" />

        <div style={{ padding: "20px 20px 100px" }}>
          {checkout === "canceled" && (
            <div className="font-body" style={{ marginBottom: 16, background: ttsColors.card, border: "1px solid rgba(230,57,70,0.35)", borderRadius: 10, padding: "12px 16px" }}>
              <p style={{ fontSize: "0.8rem", color: ttsColors.redBright, margin: 0 }}>
                Paiement annulé — tu peux réessayer quand tu veux.
              </p>
            </div>
          )}

          <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Ton compte est prêt. Choisis ton offre pour débloquer l&apos;onboarding, le programme sport, la nutrition et les capsules motivation.
          </p>

          {offers.length > 0 ? (
            <TtsPaiementOffers offers={offers} />
          ) : (
            <p className="font-body" style={{ color: ttsColors.muted, fontSize: 13 }}>
              Aucune offre disponible pour l&apos;instant — reviens bientôt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
