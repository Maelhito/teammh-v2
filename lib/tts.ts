import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export interface TtsModuleVideo {
  id: string;
  module_id: string;
  titre: string;
  lien_youtube: string;
  cover_url: string | null;
  description: string | null;
  doc_url: string | null;
  doc_name: string | null;
  ordre: number;
}

export interface TtsModule {
  id: string;
  titre: string;
  ordre: number;
  videos: TtsModuleVideo[];
}

export interface TtsProgrammeVideo {
  id: string;
  programme_id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  materiel: string[];
  cover_url: string | null;
  ordre: number;
}

export interface TtsProgramme {
  id: string;
  numero_mois: number;
  titre: string | null;
  videos: TtsProgrammeVideo[];
}

export type TtsRecetteCategorie = "petit_dej" | "dejeuner" | "diner" | "collation";

export const TTS_RECETTE_CATEGORIE_LABELS: Record<TtsRecetteCategorie, string> = {
  petit_dej: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};

export interface TtsRecette {
  id: string;
  titre: string;
  photo_url: string | null;
  texte: string | null;
  ingredients: string | null;
  macros: { calories?: number; proteines?: number; glucides?: number; lipides?: number } | null;
  categorie: TtsRecetteCategorie | null;
  duree_minutes: number | null;
}

export interface TtsCapsule {
  id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  duree_minutes: number | null;
  cover_url: string | null;
  ordre: number;
  created_at: string;
}

export interface OffreCliente {
  offre: "TTS" | "TTM" | "TTL";
  date_debut: string;
}

export async function getOffreCliente(userId: string): Promise<OffreCliente | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("offres_clientes")
    .select("offre, date_debut")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function getOnboardingModules(): Promise<TtsModule[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: modules }, { data: videos }] = await Promise.all([
    admin.from("tts_modules").select("*").order("ordre", { ascending: true }),
    admin.from("tts_modules_videos").select("*").order("ordre", { ascending: true }),
  ]);
  return (modules ?? []).map((m) => ({
    ...m,
    videos: (videos ?? []).filter((v) => v.module_id === m.id),
  }));
}

export async function getWatchedVideoIds(userId: string): Promise<Set<string>> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_modules_progress")
    .select("video_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.video_id as string));
}

/** Numéro du mois de programme sport en cours (1-indexé) selon la date de démarrage de l'offre. */
export function computeCurrentNumeroMois(dateDebut: string): number {
  const start = new Date(dateDebut + "T00:00:00");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(Math.floor(diffDays / 30) + 1, 1);
}

/** Semaine en cours (1-4) à l'intérieur du mois de programme sport en cours. */
export function computeCurrentSemaine(dateDebut: string): number {
  const start = new Date(dateDebut + "T00:00:00");
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysIntoMonth = ((diffDays % 30) + 30) % 30;
  return Math.min(Math.max(Math.floor(daysIntoMonth / 7) + 1, 1), 4);
}

export async function getProgrammes(): Promise<TtsProgramme[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: programmes }, { data: videos }] = await Promise.all([
    admin.from("tts_programmes").select("*").order("numero_mois", { ascending: true }),
    admin.from("tts_videos").select("*").order("ordre", { ascending: true }),
  ]);
  return (programmes ?? []).map((p) => ({
    ...p,
    videos: (videos ?? []).filter((v) => v.programme_id === p.id),
  }));
}

export async function getRecettes(): Promise<TtsRecette[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_recettes")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCapsules(): Promise<TtsCapsule[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_capsules")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface TtsSeanceProgress {
  video_id: string;
  semaine: number;
}

export async function getSeancesProgress(userId: string): Promise<TtsSeanceProgress[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_seances_progress")
    .select("video_id, semaine")
    .eq("user_id", userId);
  return data ?? [];
}

export async function getObjectif(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_objectifs")
    .select("objectif")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.objectif ?? null;
}

export async function createDemandeBilan(userId: string, message: string | null): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("tts_demandes_bilan").insert({ user_id: userId, message });
}

/** 0=dimanche … 6=samedi, comme Date.getDay() */
export async function getJoursEntrainement(userId: string): Promise<number[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_objectifs")
    .select("jours_entrainement")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.jours_entrainement ?? []).map((j: string) => Number(j));
}

export async function setJoursEntrainement(userId: string, jours: number[]): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_objectifs")
    .update({ jours_entrainement: jours.map(String) })
    .eq("user_id", userId)
    .select("user_id");

  // Aucune ligne tts_objectifs pour cette cliente (ex: offre assignée manuellement,
  // jamais passée par /inscription-tts) → update() ne fait rien, il faut créer la ligne.
  if (!data || data.length === 0) {
    await admin.from("tts_objectifs").insert({
      user_id: userId,
      objectif: "",
      jours_entrainement: jours.map(String),
    });
  }
}

export interface TtsSubscription {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  offer_slug: string | null;
  status: string;
  current_period_end: string | null;
}

export async function getTtsSubscription(userId: string): Promise<TtsSubscription | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export function isTtsSubscriptionActive(sub: TtsSubscription | null): boolean {
  if (!sub) return false;
  return sub.status === "active" || sub.status === "trialing";
}
