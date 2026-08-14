import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type Offre = "tts" | "ttm" | "ttl";

export interface OffreCliente {
  user_id: string;
  offre_actuelle: Offre;
  updated_at: string;
}

export interface OffreClienteHistorique {
  id: string;
  user_id: string;
  ancienne_offre: Offre | null;
  nouvelle_offre: Offre;
  changed_at: string;
  changed_by: string | null;
}

export async function getOffreActuelle(userId: string): Promise<OffreCliente | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("offres_clientes")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function changerOffre(
  userId: string,
  nouvelleOffre: Offre,
  changedBy: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const actuelle = await getOffreActuelle(userId);
  const ancienneOffre = actuelle?.offre_actuelle ?? null;

  await admin
    .from("offres_clientes")
    .upsert({ user_id: userId, offre_actuelle: nouvelleOffre, updated_at: new Date().toISOString() });

  await admin.from("offres_clientes_historique").insert({
    user_id: userId,
    ancienne_offre: ancienneOffre,
    nouvelle_offre: nouvelleOffre,
    changed_by: changedBy,
  });
}

export function estTransitionNormale(ancienneOffre: Offre | null, nouvelleOffre: Offre): boolean {
  if (ancienneOffre === null) return true;
  const ordre: Offre[] = ["tts", "ttm", "ttl"];
  return ordre.indexOf(nouvelleOffre) === ordre.indexOf(ancienneOffre) + 1;
}

export async function getHistoriqueOffres(userId: string): Promise<OffreClienteHistorique[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("offres_clientes_historique")
    .select("*")
    .eq("user_id", userId)
    .order("changed_at", { ascending: false });
  return (data ?? []) as OffreClienteHistorique[];
}
