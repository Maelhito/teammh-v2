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

export type TtlRecetteCategorie = "repas" | "petit_dej" | "collation";

export const TTL_RECETTE_CATEGORIE_LABELS: Record<TtlRecetteCategorie, string> = {
  repas: "Repas",
  petit_dej: "Petit-déjeuner",
  collation: "Collation",
};

/** Seuls le petit-déjeuner et la collation se déclinent en sucré / salé. */
export type TtlRecetteGout = "sucre" | "sale";

export const TTL_RECETTE_GOUT_LABELS: Record<TtlRecetteGout, string> = {
  sucre: "Sucré",
  sale: "Salé",
};

export function categorieAvecGout(categorie: TtlRecetteCategorie | null): boolean {
  return categorie === "petit_dej" || categorie === "collation";
}

/** Tranches de calories proposées pour chaque catégorie de recette. */
export const TTL_RECETTE_CALORIES: Record<TtlRecetteCategorie, number[]> = {
  repas: [400, 450, 500],
  petit_dej: [400, 450, 500],
  collation: [250, 300],
};

/**
 * Clé de comparaison des recettes : le nom sans accent, sans ponctuation ni majuscule.
 * « Sauté de Poulet au Riz de Chou-Fleur » et « saute de poulet au riz de chou fleur »
 * sont la même recette, « Toast jambon-œuf » et « Toast jambon oeuf » aussi.
 */
export function cleRecette(titre: string): string {
  return titre
    .toLowerCase()
    // « œuf » et « oeuf », « nœud » et « noeud » : même mot.
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Une recette = une fiche photo (titre, ingrédients et macros sont sur l'image). */
export interface TtlRecette {
  id: string;
  titre: string;
  photo_url: string;
  miniature_url: string | null;
  categorie: TtlRecetteCategorie | null;
  gout: TtlRecetteGout | null;
  calories: number | null;
}

/** Les apports caloriques proposés, dans l'ordre d'affichage. */
export const TTL_PLAN_CALORIES = [1400, 1500, 1600, 1700, 1800] as const;

/** Ce que la cliente reçoit à l'ouverture de l'onglet : jamais le PDF, jamais toutes les pages. */
export interface TtlPlanAlimentaire {
  id: string;
  calories: number;
  numero: number;
  nb_pages: number;
}

/** Les pages d'un plan, chargées seulement quand la cliente l'ouvre. */
export interface TtlPlanPages {
  pages: string[];
  miniatures: string[];
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
    .select("id, titre, photo_url, miniature_url, categorie, gout, calories")
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * La recette du jour : tirée au hasard parmi les recettes disponibles, la même toute
 * la journée (le jour de la cliente, au format AAAA-MM-JJ), une autre le lendemain.
 */
export function recetteDuJour(recettes: TtlRecette[], jour: string): TtlRecette | null {
  if (recettes.length === 0) return null;
  // Tri par id : l'ordre ne dépend pas de la date d'ajout, le tirage reste stable dans la journée.
  const triees = [...recettes].sort((a, b) => a.id.localeCompare(b.id));
  let hash = 2166136261;
  for (const c of jour) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return triees[(hash >>> 0) % triees.length];
}

export async function getPlansAlimentaires(): Promise<TtlPlanAlimentaire[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("ttl_plans_alimentaires")
    .select("id, calories, numero, nb_pages")
    .order("calories", { ascending: true })
    .order("numero", { ascending: true });
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
