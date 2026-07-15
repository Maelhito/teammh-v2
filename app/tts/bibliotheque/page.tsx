import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtsAccess } from "@/lib/tts-access";
import { getProgrammes, computeCurrentNumeroMois, computeCurrentSemaine, getRecettes, getCapsules, getSeancesProgress } from "@/lib/tts";
import TtsHeader from "@/components/TtsHeader";
import TtsBottomNav from "@/components/TtsBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtsBibliotheque from "./TtsBibliotheque";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TtsBibliothequePage({ searchParams }: PageProps) {
  const { tab } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  const offre = await requireTtsAccess(userId, isPreview);

  const [programmes, recettes, capsules, seancesProgress] = await Promise.all([
    getProgrammes(),
    getRecettes(),
    getCapsules(),
    userId ? getSeancesProgress(userId) : Promise.resolve([]),
  ]);

  const currentNumeroMois = offre?.date_debut ? computeCurrentNumeroMois(offre.date_debut) : 1;
  const currentSemaine = offre?.date_debut ? computeCurrentSemaine(offre.date_debut) : 1;
  const sorted = [...programmes].sort((a, b) => a.numero_mois - b.numero_mois);
  const reached = sorted.filter((p) => p.numero_mois <= currentNumeroMois);
  const current = reached[reached.length - 1] ?? null;
  const previous = reached.slice(0, -1).reverse();
  const future = sorted.filter((p) => p.numero_mois > currentNumeroMois);

  const initialTab: "seances" | "recettes" | "capsules" =
    tab === "recettes" || tab === "capsules" ? tab : "seances";

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtsHeader variant="page" title="Bibliothèque" subtitle="Séances · Recettes · Capsules" />

        <TtsBibliotheque
          initialTab={initialTab}
          current={current}
          previous={previous}
          future={future}
          recettes={recettes}
          capsules={capsules}
          seancesProgress={seancesProgress}
          initialSemaine={currentSemaine}
        />
      </div>

      <TtsBottomNav />
    </div>
  );
}
