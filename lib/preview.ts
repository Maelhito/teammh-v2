import { cookies } from "next/headers";
import { checkCoachAccess } from "./check-coach-access";
import { createSupabaseAdminClient } from "./supabase-admin";

export interface EffectiveUser {
  userId: string;
  firstName: string;
  email: string;
  isPreview: boolean;
}

/**
 * Résout l'utilisateur "effectif" pour les pages cliente : l'utilisateur connecté,
 * sauf si un coach a activé le mode aperçu (cookie preview_user_id) sur une cliente.
 */
export async function getEffectiveUser(
  session: { user: { id: string; email?: string; user_metadata?: { prenom?: string } } } | null
): Promise<EffectiveUser> {
  const cookieStore = await cookies();
  const previewUserId = cookieStore.get("preview_user_id")?.value;

  if (previewUserId) {
    const coach = await checkCoachAccess();
    if (coach) {
      const admin = createSupabaseAdminClient();
      const { data } = await admin
        .from("user_profiles")
        .select("prenom")
        .eq("user_id", previewUserId)
        .single();
      return {
        userId: previewUserId,
        firstName: data?.prenom ?? "Cliente",
        email: "",
        isPreview: true,
      };
    }
  }

  return {
    userId: session?.user.id ?? "",
    firstName: session?.user.user_metadata?.prenom ?? session?.user.email?.split("@")[0] ?? "",
    email: session?.user.email ?? "",
    isPreview: false,
  };
}
