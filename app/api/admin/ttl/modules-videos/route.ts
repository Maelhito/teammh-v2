import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { module_id, titre, lien_youtube, cover_url, description, doc_url, doc_name, ordre } = await request.json();
  if (!module_id || !titre || !lien_youtube) {
    return NextResponse.json({ error: "module_id, titre et lien_youtube requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_modules_videos")
    .insert({
      module_id,
      titre: String(titre).slice(0, 200),
      lien_youtube: String(lien_youtube).slice(0, 500),
      cover_url: cover_url ? String(cover_url).slice(0, 500) : null,
      description: description ? String(description).slice(0, 2000) : null,
      doc_url: doc_url ? String(doc_url).slice(0, 500) : null,
      doc_name: doc_name ? String(doc_name).slice(0, 200) : null,
      ordre: Number(ordre) || 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ video: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_modules_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
