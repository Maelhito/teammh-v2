import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export interface TtlModuleVideo {
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

export interface TtlModule {
  id: string;
  titre: string;
  ordre: number;
  videos: TtlModuleVideo[];
}

export interface TtlProgrammeVideo {
  id: string;
  programme_id: string;
  titre: string;
  lien_youtube: string;
  description: string | null;
  materiel: string[];
  cover_url: string | null;
  ordre: number;
}

export interface TtlProgramme {
  id: string;
  numero_mois: number;
  titre: string | null;
  /** Couverture du programme entier, affichée en tête de la partie Sport. */
  cover_url: string | null;
  videos: TtlProgrammeVideo[];
}

export type TtlRecetteCategorie = "petit_dej" | "dejeuner" | "diner" | "collation";

export const TTL_RECETTE_CATEGORIE_LABELS: Record<TtlRecetteCategorie, string> = {
  petit_dej: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};

export interface TtlRecette {
  id: string;
  titre: string;
  photo_url: string | null;
  texte: string | null;
  ingredients: string | null;
  macros: { calories?: number; proteines?: number; glucides?: number; lipides?: number } | null;
  categorie: TtlRecetteCategorie | null;
  duree_minutes: number | null;
}

export interface TtlCapsule {
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
  offre: "TTM" | "TTL";
  date_debut: string;
  /**
   * true : l'offre vient d'une inscription publique, l'accès est conditionné à
   * un abonnement Stripe actif.
   * false : l'offre a été attribuée par l'admin — c'est sa décision, l'accès est
   * immédiat et aucun paiement n'est demandé.
   */
  paiement_requis: boolean;
}

export async function getOffreCliente(userId: string): Promise<OffreCliente | null> {
  const admin = createSupabaseAdminClient();

  const avecColonne = await admin
    .from("offres_clientes")
    .select("offre, date_debut, paiement_requis")
    .eq("user_id", userId)
    .maybeSingle();

  if (!avecColonne.error) {
    return avecColonne.data
      ? { ...avecColonne.data, paiement_requis: avecColonne.data.paiement_requis ?? false }
      : null;
  }

  // Repli tant que la migration n'est pas passée : personne n'est enfermé
  // dehors, on considère l'accès comme accordé.
  const { data } = await admin
    .from("offres_clientes")
    .select("offre, date_debut")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { ...data, paiement_requis: false } : null;
}

export async function getOnboardingModules(): Promise<TtlModule[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: modules }, { data: videos }] = await Promise.all([
    admin.from("ttl_modules").select("*").order("ordre", { ascending: true }),
    admin.from("ttl_modules_videos").select("*").order("ordre", { ascending: true }),
  ]);
  return (modules ?? []).map((m) => ({
    ...m,
    videos: (videos ?? []).filter((v) => v.module_id === m.id),
  }));
}

export async function getWatchedVideoIds(userId: string): Promise<Set<string>> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_modules_progress")
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

export async function getProgrammes(): Promise<TtlProgramme[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: programmes }, { data: videos }] = await Promise.all([
    admin.from("ttl_programmes").select("*").order("numero_mois", { ascending: true }),
    admin.from("ttl_videos").select("*").order("ordre", { ascending: true }),
  ]);
  return (programmes ?? []).map((p) => ({
    ...p,
    videos: (videos ?? []).filter((v) => v.programme_id === p.id),
  }));
}

export async function getRecettes(): Promise<TtlRecette[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_recettes")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCapsules(): Promise<TtlCapsule[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_capsules")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface TtlSeanceProgress {
  video_id: string;
  semaine: number;
}

export async function getSeancesProgress(userId: string): Promise<TtlSeanceProgress[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_seances_progress")
    .select("video_id, semaine")
    .eq("user_id", userId);
  return data ?? [];
}

export async function getObjectif(userId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_objectifs")
    .select("objectif")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.objectif ?? null;
}

/** 0=dimanche … 6=samedi, comme Date.getDay() */
export async function getJoursEntrainement(userId: string): Promise<number[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_objectifs")
    .select("jours_entrainement")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.jours_entrainement ?? []).map((j: string) => Number(j));
}

export async function setJoursEntrainement(userId: string, jours: number[]): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_objectifs")
    .update({ jours_entrainement: jours.map(String) })
    .eq("user_id", userId)
    .select("user_id");

  // Aucune ligne ttl_objectifs pour cette cliente (ex: offre assignée manuellement,
  // jamais passée par /inscription-ttl) → update() ne fait rien, il faut créer la ligne.
  if (!data || data.length === 0) {
    await admin.from("ttl_objectifs").insert({
      user_id: userId,
      objectif: "",
      jours_entrainement: jours.map(String),
    });
  }
}

export interface TtlSubscription {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  offer_slug: string | null;
  status: string;
  current_period_end: string | null;
}

export async function getTtlSubscription(userId: string): Promise<TtlSubscription | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export function isTtlSubscriptionActive(sub: TtlSubscription | null): boolean {
  if (!sub) return false;
  return sub.status === "active" || sub.status === "trialing";
}
