import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { slug, url } = await request.json();
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("modules_content")
    .upsert({ slug, lien_canva_equivalences: url || null }, { onConflict: "slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
