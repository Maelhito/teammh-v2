/**
 * Résolution du fuseau d'une personne — côté serveur uniquement.
 *
 * Séparé de `lib/temps.ts` (qui est pur et sans dépendance) parce que ce
 * fichier touche le client admin Supabase : l'importer depuis un composant
 * client embarquerait la clé de service dans le bundle envoyé au navigateur.
 * Les fonctions de calcul, elles, servent des deux côtés.
 */

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FUSEAU_PAR_DEFAUT, estFuseauValide, fuseauOuDefaut } from "@/lib/temps";

// ─── Source de vérité : le fuseau d'une personne ──────────────────────────────

/**
 * Ordre de résolution, du plus fiable au moins fiable :
 *   1. user_profiles.timezone      — mis à jour à chaque chargement de l'app
 *   2. push_subscriptions.timezone — ancien emplacement, figé au 1er abonnement
 *   3. FUSEAU_PAR_DEFAUT
 *
 * Le point 2 disparaîtra une fois que tout le monde aura rouvert l'app au
 * moins une fois ; il évite une régression pour qui ne s'est pas reconnecté.
 */
export async function getFuseau(userId: string): Promise<string> {
  const fuseaux = await getFuseaux([userId]);
  return fuseaux.get(userId) ?? FUSEAU_PAR_DEFAUT;
}

/** Version groupée — indispensable aux crons, qui balaient tout le monde. */
export async function getFuseaux(userIds: string[]): Promise<Map<string, string>> {
  const resultat = new Map<string, string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return resultat;

  const admin = createSupabaseAdminClient();

  const [profils, subs] = await Promise.all([
    admin.from("user_profiles").select("user_id, timezone").in("user_id", ids),
    admin.from("push_subscriptions").select("user_id, timezone").in("user_id", ids),
  ]);

  // Repli d'abord, source de vérité ensuite : le second écrase le premier.
  for (const ligne of subs.data ?? []) {
    if (estFuseauValide(ligne.timezone)) resultat.set(ligne.user_id, ligne.timezone);
  }
  for (const ligne of profils.data ?? []) {
    if (estFuseauValide(ligne.timezone)) resultat.set(ligne.user_id, ligne.timezone);
  }

  for (const id of ids) {
    if (!resultat.has(id)) resultat.set(id, FUSEAU_PAR_DEFAUT);
  }
  return resultat;
}

/**
 * Écrit le fuseau d'une personne.
 *
 * `auto` distingue les deux origines :
 *   • true  — détecté depuis l'appareil (SyncFuseau, abonnement push). Ne doit
 *     jamais écraser un choix manuel, sinon la personne qui a forcé son fuseau
 *     le verrait sauter à chaque chargement.
 *   • false — choisi à la main dans le profil. Fait foi jusqu'à nouvel ordre.
 *
 * Renvoie le fuseau réellement en base après l'opération.
 */
export async function setFuseau(
  userId: string,
  fuseau: string,
  auto: boolean
): Promise<{ timezone: string; auto: boolean; ignore: boolean }> {
  const admin = createSupabaseAdminClient();
  const tz = fuseauOuDefaut(fuseau);

  const { data: existant } = await admin
    .from("user_profiles")
    .select("timezone, timezone_auto")
    .eq("user_id", userId)
    .maybeSingle();

  // Un choix manuel gagne toujours contre une détection automatique.
  if (auto && existant?.timezone_auto === false) {
    return { timezone: existant.timezone ?? tz, auto: false, ignore: true };
  }

  // Rien n'a bougé : on n'écrit pas pour ne pas remuer updated_at à chaque
  // chargement de page.
  if (existant && existant.timezone === tz && existant.timezone_auto === auto) {
    return { timezone: tz, auto, ignore: true };
  }

  const champs = { timezone: tz, timezone_auto: auto, timezone_updated_at: new Date().toISOString() };

  if (existant) {
    await admin.from("user_profiles").update(champs).eq("user_id", userId);
  } else {
    // Un coach ou une admin n'a pas forcément de ligne user_profiles : on la
    // crée, avec le seul fuseau. L'échec n'est pas bloquant — le fuseau est un
    // confort, il ne doit jamais empêcher l'app de s'afficher.
    const { error } = await admin.from("user_profiles").insert({ user_id: userId, ...champs });
    if (error) console.error("[temps] création du profil impossible :", error.message);
  }

  return { timezone: tz, auto, ignore: false };
}
