import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getOnboardingModules, getWatchedVideoIds } from "@/lib/ttl";
import { computeTtlModuleUnlock } from "@/lib/ttl-unlock";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtlModuleVideos from "./TtlModuleVideos";

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

  const [modules, watchedIds] = await Promise.all([
    getOnboardingModules(),
    userId ? getWatchedVideoIds(userId) : Promise.resolve(new Set<string>()),
  ]);

  const index = modules.findIndex((m) => m.id === id);
  if (index === -1) notFound();
  const moduleData = modules[index];

  const unlocks = computeTtlModuleUnlock(modules, watchedIds);
  if (!unlocks[index]) redirect("/ttl/parcours?locked=1");

  const videos = moduleData.videos.map((v) => ({ ...v, watched: watchedIds.has(v.id) }));

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" back backHref="/ttl/parcours" title={`Module ${index + 1}`} subtitle={moduleData.titre} />

        <div style={{ padding: "20px 20px 0" }}>
          <TtlModuleVideos videos={videos} />
        </div>
      </div>

      <TtlBottomNav />
    </div>
  );
}
