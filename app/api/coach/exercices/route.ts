import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercises: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await req.json();
  const { nom, groupe_musculaire, materiel, type_format, description, video_url, miniature_url } = body;

  if (!nom?.trim() || !groupe_musculaire?.trim()) {
    return NextResponse.json({ error: "Nom et groupe musculaire requis." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .insert({ nom: nom.trim(), groupe_musculaire, materiel, type_format, description, video_url, miniature_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercise: data }, { status: 201 });
}
