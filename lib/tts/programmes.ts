import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export interface Video {
  id: string;
  programme_id: string;
  titre: string;
  url_youtube: string;
  ordre: number;
  created_at: string;
}

export interface Programme {
  id: string;
  nom: string;
  actif: boolean;
  created_at: string;
  videos: Video[];
}

async function attachVideos(admin: ReturnType<typeof createSupabaseAdminClient>, programmes: Omit<Programme, "videos">[]): Promise<Programme[]> {
  if (programmes.length === 0) return [];
  const { data: videos } = await admin
    .from("tts_videos")
    .select("*")
    .in("programme_id", programmes.map((p) => p.id))
    .order("ordre", { ascending: true });

  return programmes.map((programme) => ({
    ...programme,
    videos: (videos ?? []).filter((v: Video) => v.programme_id === programme.id),
  }));
}

export async function getProgrammeActif(): Promise<Programme | null> {
  const admin = createSupabaseAdminClient();
  const { data: programme } = await admin
    .from("tts_programmes")
    .select("*")
    .eq("actif", true)
    .single();
  if (!programme) return null;
  const [withVideos] = await attachVideos(admin, [programme]);
  return withVideos ?? null;
}

export async function getAllProgrammes(): Promise<Programme[]> {
  const admin = createSupabaseAdminClient();
  const { data: programmes } = await admin
    .from("tts_programmes")
    .select("*")
    .order("created_at", { ascending: false });
  return attachVideos(admin, programmes ?? []);
}

export async function activerProgramme(programmeId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("tts_programmes").update({ actif: false }).neq("id", programmeId);
  await admin.from("tts_programmes").update({ actif: true }).eq("id", programmeId);
}
