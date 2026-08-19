import { createSupabaseAdminClient } from "./supabase-admin";
import { isAdminUser } from "./is-admin";

type UserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null | undefined;

/**
 * Une cliente « appartient » au coach connecté si son profil le désigne comme
 * coach ou comme nutritionniste.
 *
 * Attention au piège du modèle : `user_profiles.coach_id` ne contient PAS un id
 * d'utilisateur auth, mais un id de `team_members`. Un même compte peut porter
 * plusieurs casquettes, listées dans `user_metadata.team_member_ids` (c'est la
 * règle qu'applique déjà la liste des clientes du portail coach).
 *
 * L'admin voit tout le monde.
 */
export async function coachPeutVoirCliente(user: UserLike, clienteId: string): Promise<boolean> {
  if (!user) return false;
  if (isAdminUser(user)) return true;

  // En développement, checkCoachAccess renvoie un utilisateur factice sans
  // équipe : on laisse passer pour ne pas bloquer les tests locaux.
  if (process.env.NODE_ENV === "development") return true;

  const teamMemberIds = (user.user_metadata?.team_member_ids as string[] | undefined) ?? [];
  if (!teamMemberIds.length) return false;

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("coach_id, nutrition_id")
    .eq("user_id", clienteId)
    .maybeSingle();

  if (error || !profile) return false;

  return (
    (profile.coach_id !== null && teamMemberIds.includes(profile.coach_id)) ||
    (profile.nutrition_id !== null && teamMemberIds.includes(profile.nutrition_id))
  );
}
