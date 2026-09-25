import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getProgrammes, computeCurrentPeriode, computeCurrentSemaine, getSeancesProgress, getChoixProgramme, programmeDeLaPeriode } from "@/lib/ttl";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtlSport from "./TtlSport";

export const dynamic = "force-dynamic";

export default async function TtlSportPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  const offre = await requireTtlAccess(userId, isPreview);

  const periode = offre?.date_debut ? computeCurrentPeriode(offre.date_debut) : 1;
  const currentSemaine = offre?.date_debut ? computeCurrentSemaine(offre.date_debut) : 1;

  const [programmes, seancesProgress, choixId] = await Promise.all([
    getProgrammes(),
    userId ? getSeancesProgress(userId) : Promise.resolve([]),
    userId ? getChoixProgramme(userId, periode) : Promise.resolve(null),
  ]);

  const current = programmeDeLaPeriode(programmes, periode, choixId);
  const tous = [...programmes].sort((a, b) => a.numero_mois - b.numero_mois);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Sport" subtitle="Ton programme des 4 semaines, semaine par semaine" />

        <TtlSport
          current={current}
          programmes={tous}
          seancesProgress={seancesProgress.filter((p) => p.periode === periode)}
          initialSemaine={currentSemaine}
          isPreview={isPreview}
        />
      </div>

      <TtlBottomNav />
    </div>
  );
}
