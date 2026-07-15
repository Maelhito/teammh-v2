import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtsAccess } from "@/lib/tts-access";
import { getOnboardingModules, getWatchedVideoIds } from "@/lib/tts";
import { computeTtsModuleUnlock } from "@/lib/tts-unlock";
import TtsHeader from "@/components/TtsHeader";
import TtsBottomNav from "@/components/TtsBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtsModuleVideos from "./TtsModuleVideos";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TtsModulePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtsAccess(userId, isPreview);

  const [modules, watchedIds] = await Promise.all([
    getOnboardingModules(),
    userId ? getWatchedVideoIds(userId) : Promise.resolve(new Set<string>()),
  ]);

  const index = modules.findIndex((m) => m.id === id);
  if (index === -1) notFound();
  const moduleData = modules[index];

  const unlocks = computeTtsModuleUnlock(modules, watchedIds);
  if (!unlocks[index]) redirect("/tts/parcours?locked=1");

  const videos = moduleData.videos.map((v) => ({ ...v, watched: watchedIds.has(v.id) }));

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtsHeader variant="page" back backHref="/tts/parcours" title={`Module ${index + 1}`} subtitle={moduleData.titre} />

        <div style={{ padding: "20px 20px 0" }}>
          <TtsModuleVideos videos={videos} />
        </div>
      </div>

      <TtsBottomNav />
    </div>
  );
}
