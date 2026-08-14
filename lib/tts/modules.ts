import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type ModuleOffre = "tts" | "ttl";
export type ModuleType = "video" | "document" | "mixed";

export interface Module {
  id: string;
  offre: ModuleOffre;
  titre: string;
  description: string | null;
  contenu: string | null;
  type: ModuleType;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export async function getTtsModules(offre: ModuleOffre): Promise<Module[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_modules")
    .select("*")
    .eq("offre", offre)
    .order("ordre", { ascending: true });
  return (data ?? []) as Module[];
}

export async function getTtsModuleById(id: string): Promise<Module | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("tts_modules")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}
