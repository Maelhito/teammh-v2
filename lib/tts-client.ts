import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type Offre = "TTS" | "TTM" | "TTL";

export async function getClienteOffre(userId: string): Promise<Offre | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("offres_clientes")
    .select("offre")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.offre as Offre) ?? null;
}

export interface TtsModuleVideo {
  id: string;
  titre: string;
  lien_youtube: string;
  cover_url: string | null;
  description: string | null;
  doc_url: string | null;
  doc_name: string | null;
  ordre: number;
  watched: boolean;
}

export interface TtsModuleWithProgress {
  id: string;
  titre: string;
  ordre: number;
  videos: TtsModuleVideo[];
  unlocked: boolean;
  completed: boolean;
}

export async function getOnboardingModules(userId: string): Promise<TtsModuleWithProgress[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: modules }, { data: videos }, { data: progress }] = await Promise.all([
    admin.from("tts_modules").select("*").order("ordre", { ascending: true }),
    admin.from("tts_modules_videos").select("*").order("ordre", { ascending: true }),
    admin.from("tts_modules_progress").select("video_id").eq("user_id", userId),
  ]);

  const watchedSet = new Set((progress ?? []).map((p) => p.video_id));

  let previousCompleted = true;
  return (modules ?? []).map((m) => {
    const moduleVideos = (videos ?? [])
      .filter((v) => v.module_id === m.id)
      .map((v) => ({ ...v, watched: watchedSet.has(v.id) }));
    const completed = moduleVideos.length > 0 && moduleVideos.every((v) => v.watched);
    const unlocked = previousCompleted;
    previousCompleted = unlocked && completed;
    return { id: m.id, titre: m.titre, ordre: m.ordre, videos: moduleVideos, unlocked, completed };
  });
}

export async function getVideoWithModule(userId: string, videoId: string) {
  const admin = createSupabaseAdminClient();
  const { data: video } = await admin.from("tts_modules_videos").select("*").eq("id", videoId).maybeSingle();
  if (!video) return null;
  const { data: watchedRow } = await admin
    .from("tts_modules_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle();
  return { ...video, watched: !!watchedRow };
}

export async function markVideoWatched(userId: string, videoId: string) {
  const admin = createSupabaseAdminClient();
  await admin.from("tts_modules_progress").upsert(
    { user_id: userId, video_id: videoId },
    { onConflict: "user_id,video_id" }
  );
}

export interface SportVideo {
  id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  materiel: string[] | null;
  cover_url: string | null;
  numero_mois: number;
  programme_titre: string | null;
}

export async function getSportVideos(): Promise<SportVideo[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: programmes }, { data: videos }] = await Promise.all([
    admin.from("tts_programmes").select("*").order("numero_mois", { ascending: true }),
    admin.from("tts_videos").select("*").order("ordre", { ascending: true }),
  ]);
  const programmeMap = Object.fromEntries((programmes ?? []).map((p) => [p.id, p]));
  return (videos ?? []).map((v) => ({
    id: v.id,
    titre: v.titre,
    lien_youtube: v.lien_youtube,
    description: v.description,
    materiel: v.materiel,
    cover_url: v.cover_url,
    numero_mois: programmeMap[v.programme_id]?.numero_mois ?? 0,
    programme_titre: programmeMap[v.programme_id]?.titre ?? null,
  }));
}

export interface Recette {
  id: string;
  titre: string;
  photo_url: string | null;
  texte: string | null;
  ingredients: string | null;
  macros: { calories?: number; proteines?: number; glucides?: number; lipides?: number } | null;
}

export async function getRecettes(): Promise<Recette[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("tts_recettes").select("*").order("created_at", { ascending: false });
  return data ?? [];
}
