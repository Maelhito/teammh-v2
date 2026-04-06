import { createSupabaseAdminClient } from "./supabase-admin";

export interface ModuleContent {
  slug: string;
  video_url_1: string | null;
  video_url_2: string | null;
  video_url_3: string | null;
  video_url_4: string | null;
  video_url_5: string | null;
  video_url_6: string | null;
  video_url_7: string | null;
  video_url_8: string | null;
  video_url_9: string | null;
  video_url_10: string | null;
  pdf_url: string | null;
  pdf_name: string | null;
  pdf_url_2: string | null;
  pdf_name_2: string | null;
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
