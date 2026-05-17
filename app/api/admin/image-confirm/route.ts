import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { slug, filename } = await request.json();
  if (!slug || !filename) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const storagePath = `${slug}/${filename}`;
  const admin = createSupabaseAdminClient();

  const { data: { publicUrl } } = admin.storage
    .from("module-images")
    .getPublicUrl(storagePath);

  const { error } = await admin
    .from("modules_content")
    .upsert({ slug, image_url_1: publicUrl }, { onConflict: "slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, url: publicUrl });
}
