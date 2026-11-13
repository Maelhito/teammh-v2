import type { User } from "@supabase/supabase-js";
import type { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { BUCKET_PHOTOS } from "@/lib/photos-progression";

/**
 * Suppression d'un compte cliente PAR ELLE-MÊME (exigée par l'App Store et
 * Google Play). Tout part : abonnement, photos, mesures, suivi, puis le compte.
 *
 * Ordre voulu :
 *   1. l'abonnement Stripe — si on n'arrive pas à l'arrêter, on ne supprime
 *      RIEN : un compte effacé qui continue d'être prélevé serait le pire cas ;
 *   2. les fichiers (photos de progression, photo de profil) ;
 *   3. les lignes en base, table par table ;
 *   4. le compte lui-même.
 */

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Tables dont les lignes d'une cliente sont repérées par `user_id`. */
const TABLES_USER_ID = [
  "photos_progression",
  "mesures",
  "questionnaire_demarrage",
  "seances_log",
  "module_completions",
  "taches_validations",
  "avis_google_reponses",
  "push_subscriptions",
  "notif_log",
  "client_programmes",
  "offres_clientes",
  "offres_clientes_historique",
  "ttl_seances_progress",
  "ttl_modules_progress",
  "ttl_objectifs",
  "ttl_questionnaire",
  "ttl_programme_choix",
  "ttl_resiliations",
  "ttl_subscriptions",
  "user_profiles",
];

const BUCKET_AVATARS = "avatars";

const ERREUR_ABONNEMENT =
  "Ton abonnement n'a pas pu être arrêté, donc rien n'a été supprimé. Écris-nous sur WhatsApp pour qu'on s'en occupe.";

export type ResultatSuppression = { ok: true } | { ok: false; erreur: string };

/** Arrête l'abonnement TTL. Renvoie un message d'erreur si l'arrêt a échoué. */
async function arreterAbonnement(admin: Admin, userId: string): Promise<string | null> {
  const { data: abonnement } = await admin
    .from("ttl_subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const id = abonnement?.stripe_subscription_id;
  if (!id) return null;

  const stripe = getStripe();
  if (!stripe) return ERREUR_ABONNEMENT;

  try {
    const actuel = await stripe.subscriptions.retrieve(id);
    if (actuel.status === "canceled" || actuel.status === "incomplete_expired") return null;
    await stripe.subscriptions.cancel(id);
    return null;
  } catch (err) {
    // Abonnement inconnu de Stripe : il n'y a plus rien à arrêter.
    if ((err as { code?: string })?.code === "resource_missing") return null;
    console.error("[suppression-compte] arrêt de l'abonnement échoué", err);
    return ERREUR_ABONNEMENT;
  }
}

async function supprimerFichiers(admin: Admin, userId: string): Promise<void> {
  try {
    const { data: photos } = await admin.from("photos_progression").select("path").eq("user_id", userId);
    const chemins = (photos ?? []).map((p) => p.path as string).filter(Boolean);
    if (chemins.length) await admin.storage.from(BUCKET_PHOTOS).remove(chemins);
  } catch (err) {
    console.error("[suppression-compte] photos de progression", err);
  }

  try {
    // Les photos de profil sont nommées `<user_id>-<date>.<ext>`.
    const { data: avatars } = await admin.storage.from(BUCKET_AVATARS).list("", { search: userId, limit: 100 });
    const noms = (avatars ?? []).map((f) => f.name).filter((n) => n.startsWith(`${userId}-`));
    if (noms.length) await admin.storage.from(BUCKET_AVATARS).remove(noms);
  } catch (err) {
    console.error("[suppression-compte] photo de profil", err);
  }
}

export async function supprimerCompteCliente(admin: Admin, user: User): Promise<ResultatSuppression> {
  const erreurAbonnement = await arreterAbonnement(admin, user.id);
  if (erreurAbonnement) return { ok: false, erreur: erreurAbonnement };

  await supprimerFichiers(admin, user.id);

  // Table par table, sans s'arrêter : une table absente ou déjà vide ne doit
  // pas empêcher d'effacer les autres.
  for (const table of TABLES_USER_ID) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) console.error(`[suppression-compte] ${table}`, error.message);
  }
  // Les événements du calendrier posés POUR elle (rendez-vous, tâches).
  const { error: erreurAgenda } = await admin.from("calendar_events").delete().eq("target_user_id", user.id);
  if (erreurAgenda) console.error("[suppression-compte] calendar_events", erreurAgenda.message);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[suppression-compte] compte", error.message);
    return { ok: false, erreur: "Tes données ont été effacées, mais le compte n'a pas pu être fermé. Écris-nous sur WhatsApp pour qu'on termine." };
  }
  return { ok: true };
}
