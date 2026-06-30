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

  const { programme_id, titre, lien_youtube, description, materiel, cover_url, ordre } = await request.json();
  if (!programme_id || !titre || !lien_youtube) {
    return NextResponse.json({ error: "programme_id, titre et lien_youtube requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { count } = await admin
    .from("tts_videos")
    .select("id", { count: "exact", head: true })
    .eq("programme_id", programme_id);
  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: "Ce programme a déjà ses 3 vidéos" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("tts_videos")
    .insert({
      programme_id,
      titre: String(titre).slice(0, 200),
      lien_youtube: String(lien_youtube).slice(0, 500),
      description: description ? String(description).slice(0, 2000) : null,
      materiel: Array.isArray(materiel) ? materiel.map((m) => String(m).slice(0, 100)) : [],
      cover_url: cover_url ? String(cover_url).slice(0, 500) : null,
      ordre: Number(ordre) || (count ?? 0) + 1,
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
  const { error } = await admin.from("tts_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
