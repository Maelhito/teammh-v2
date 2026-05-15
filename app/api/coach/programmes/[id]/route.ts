import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("programmes").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programme: data });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { nom, categorie, niveau, duree_semaines, description, image_url } = body;
  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("programmes")
    .update({ nom: nom.trim(), categorie, niveau, duree_semaines, description, image_url: image_url ?? null })
    .eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programme: data });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("programmes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
