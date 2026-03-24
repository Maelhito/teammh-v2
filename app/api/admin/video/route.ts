import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";
const ALLOWED_FIELDS = ["video_url_1", "video_url_2", "video_url_3"] as const;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { slug, field, url } = await request.json();

  if (!slug || !field) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: "Champ invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("modules_content")
    .upsert({ slug, [field]: url || null }, { onConflict: "slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
