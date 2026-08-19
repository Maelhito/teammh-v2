/**
 * Accès révoqué : qui ne doit plus apparaître côté coach.
 *
 * Depuis l'admin, « Révoquer » passe `user_profiles.acces_app` à `false`.
 * Jusqu'ici ce drapeau ne bloquait que la cliente elle-même : les coachs
 * continuaient de voir sa fiche dans leurs listes, comme si de rien n'était.
 *
 * Une valeur absente vaut « a accès » : l'admin lit lui aussi `acces_app ?? true`
 * pour les profils créés avant l'ajout de la colonne.
 *
 */

import { createSupabaseAdminClient } from "./supabase-admin";

/** L'accès à l'app a-t-il été révoqué pour ce profil ? */
export function accesRevoque(profil: { acces_app?: boolean | null }): boolean {
  return profil.acces_app === false;
}

/** Garde les profils encore actifs (accès non révoqué depuis l'admin). */
export function sansAccesRevoque<T extends { acces_app?: boolean | null }>(profils: T[]): T[] {
  return profils.filter((p) => !accesRevoque(p));
}

/**
 * Cette cliente a-t-elle été révoquée ?
 *
 * Masquer la cliente des listes ne suffit pas : son identifiant reste tapable
 * dans l'URL, et les routes de sa fiche ne vérifient rien d'autre que le rôle
 * de l'appelant. Elles doivent donc refuser de répondre pour un accès révoqué.
 *
 * Profil absent = accès conservé, même règle que `accesRevoque`.
 */
export async function clienteRevoquee(clientId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("acces_app")
    .eq("user_id", clientId)
    .maybeSingle();

  return !!data && accesRevoque(data);
}
