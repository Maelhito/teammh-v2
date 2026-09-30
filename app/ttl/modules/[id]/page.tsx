import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getOnboardingModules, getWatchedVideoIds, getTtlQuestionnaire } from "@/lib/ttl";
import { computeTtlParcours } from "@/lib/ttl-unlock";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtlModuleVideos from "./TtlModuleVideos";
import TtlQuestionnaire from "./TtlQuestionnaire";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TtlModulePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtlAccess(userId, isPreview);

  const [modules, watchedIds, questionnaire] = await Promise.all([
    getOnboardingModules(),
    userId ? getWatchedVideoIds(userId) : Promise.resolve(new Set<string>()),
    userId ? getTtlQuestionnaire(userId) : Promise.resolve({ reponses: null, complet: false }),
  ]);

  const index = modules.findIndex((m) => m.id === id);
  if (index === -1) notFound();
  const moduleData = modules[index];

  const etat = computeTtlParcours(modules, watchedIds, questionnaire.complet)[index];
  if (!etat.debloque) redirect("/ttl?locked=1#parcours");

  const videos = moduleData.videos.map((v) => ({ ...v, watched: watchedIds.has(v.id) }));
  const videosVues = videos.every((v) => v.watched);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" back backHref="/ttl" title={`Module ${index + 1}`} subtitle={moduleData.titre} />

        <div style={{ padding: "0 16px" }}>
          {/* Vidéos, puis (module 1) le questionnaire  */}
          <TtlModuleVideos
            videos={videos}
            resteQuestionnaire={etat.avecQuestionnaire && !questionnaire.complet}
            etapeFinale={
              etat.avecQuestionnaire
                ? {
                    faite: questionnaire.complet,
                    contenu: (
                      <TtlQuestionnaire
                        initialReponses={questionnaire.reponses}
                        initialComplet={questionnaire.complet}
                        prenom={firstName ?? ""}
                        videosVues={videosVues}
                      />
                    ),
                  }
                : undefined
            }
          />
        </div>
      </div>

      <TtlBottomNav />
    </div>
  );
}
