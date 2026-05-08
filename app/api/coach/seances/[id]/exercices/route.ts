import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

async function checkAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? "cliente";
  if (role !== "coach" && role !== "admin" && user.email !== "mael.ld@hotmail.fr") return null;
  return user;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkAccess();
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
  const user = await checkAccess();
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
