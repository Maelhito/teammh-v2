import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ALLOWED_FIELDS = [
  "video_title_1", "video_title_2", "video_title_3",
  "video_title_4", "video_title_5", "video_title_6",
  "video_title_7", "video_title_8", "video_title_9", "video_title_10",
] as const;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { slug, field, title } = await request.json();

  if (!slug || !field) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: "Champ invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("modules_content")
    .upsert({ slug, [field]: title || null }, { onConflict: "slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
