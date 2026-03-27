import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export interface UserProfile {
  user_id: string;
  prenom: string | null;
  nom: string | null;
  objectif_4mois_poids: string | null;
  objectif_4mois_bienetre: string | null;
  objectif_12mois_poids: string | null;
  objectif_12mois_bienetre: string | null;
  date_demarrage: string | null;
  updated_at: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function getModuleCompletions(userId: string): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("module_completions")
    .select("module_slug")
    .eq("user_id", userId);
  return (data ?? []).map((r: { module_slug: string }) => r.module_slug);
}
