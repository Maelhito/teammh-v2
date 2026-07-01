import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoWithModule } from "@/lib/tts-client";
import VideoWatchClient from "./VideoWatchClient";

export const dynamic = "force-dynamic";

export default async function ParcoursVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const video = await getVideoWithModule(user!.id, videoId);
  if (!video) notFound();

  return <VideoWatchClient video={video} />;
}
