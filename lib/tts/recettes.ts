import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type RecetteOffre = "tts" | "ttl";
export type RecetteCategorie = "petit_dej" | "dejeuner" | "diner" | "collation";

export interface Ingredient {
  nom: string;
  quantite: string;
  unite: string;
}

export interface Recette {
  id: string;
  titre: string;
  categorie: RecetteCategorie;
  photo_url: string | null;
  texte_preparation: string;
  ingredients: Ingredient[];
  calories: number | null;
  lipides_g: number | null;
  glucides_g: number | null;
  proteines_g: number | null;
  offres_autorisees: RecetteOffre[];
  created_at: string;
  updated_at: string;
}

export async function getRecettes(offre: RecetteOffre): Promise<Recette[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_recettes")
    .select("*")
    .contains("offres_autorisees", [offre])
    .order("created_at", { ascending: false });
  return (data ?? []) as Recette[];
}

export async function getRecettesByCategorie(
  offre: RecetteOffre,
  categorie: RecetteCategorie
): Promise<Recette[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_recettes")
    .select("*")
    .contains("offres_autorisees", [offre])
    .eq("categorie", categorie)
    .order("created_at", { ascending: false });
  return (data ?? []) as Recette[];
}

export async function getRecetteById(id: string): Promise<Recette | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_recettes")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}
