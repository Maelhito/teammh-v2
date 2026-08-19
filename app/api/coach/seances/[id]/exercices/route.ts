import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("seance_exercices")
    .select("*, exercise:exercises(id,nom,groupe_musculaire,materiel,video_url,miniature_url)")
    .eq("seance_id", id)
    .order("ordre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercices: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("seance_exercices")
    .select("ordre")
    .eq("seance_id", id)
    .order("ordre", { ascending: false })
    .limit(1);

  const nextOrdre = ((existing?.[0]?.ordre ?? -1) as number) + 1;

  const { data, error } = await admin
    .from("seance_exercices")
    .insert({
      seance_id: id,
      exercise_id: body.exercise_id,
      ordre: nextOrdre,
      series: body.series || null,
      repetitions: body.repetitions || null,
      duree_secondes: body.duree_secondes || null,
      temps_repos: body.temps_repos ?? 60,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercice: data }, { status: 201 });
}
