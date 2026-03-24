import { createSupabaseAdminClient } from "./supabase-admin";

export interface ModuleContent {
  slug: string;
  video_url_1: string | null;
  video_url_2: string | null;
  video_url_3: string | null;
  pdf_url: string | null;
  pdf_name: string | null;
}

export async function getModuleContent(slug: string): Promise<ModuleContent | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("modules_content")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getAllModulesContent(): Promise<Record<string, ModuleContent>> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from("modules_content").select("*");
    const map: Record<string, ModuleContent> = {};
    (data ?? []).forEach((row: ModuleContent) => { map[row.slug] = row; });
    return map;
  } catch {
    return {};
  }
}
