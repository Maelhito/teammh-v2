import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess, isCoachOnly } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { nom, groupe_musculaire, materiel, type_format, description, video_url, miniature_url } = body;

  if (!nom?.trim() || !groupe_musculaire?.trim()) {
    return NextResponse.json({ error: "Nom et groupe musculaire requis." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .update({ nom: nom.trim(), groupe_musculaire, materiel, type_format, description, video_url, miniature_url })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercise: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  if (isCoachOnly(user)) return NextResponse.json({ error: "Seul l'admin peut supprimer un exercice." }, { status: 403 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("exercises").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
