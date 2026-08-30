import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getProgrammes, computeCurrentNumeroMois, computeCurrentSemaine, getSeancesProgress } from "@/lib/ttl";
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

  const [programmes, seancesProgress] = await Promise.all([
    getProgrammes(),
    userId ? getSeancesProgress(userId) : Promise.resolve([]),
  ]);

  const currentNumeroMois = offre?.date_debut ? computeCurrentNumeroMois(offre.date_debut) : 1;
  const currentSemaine = offre?.date_debut ? computeCurrentSemaine(offre.date_debut) : 1;
  const sorted = [...programmes].sort((a, b) => a.numero_mois - b.numero_mois);
  const reached = sorted.filter((p) => p.numero_mois <= currentNumeroMois);
  const current = reached[reached.length - 1] ?? null;
  const previous = reached.slice(0, -1).reverse();
  const future = sorted.filter((p) => p.numero_mois > currentNumeroMois);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Sport" subtitle="Ton programme du mois, semaine par semaine" />

        <TtlSport
          current={current}
          previous={previous}
          future={future}
          seancesProgress={seancesProgress}
          initialSemaine={currentSemaine}
        />
      </div>

      <TtlBottomNav />
    </div>
  );
}
