import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess, isCoachOnly } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const [{ data: seance }, { data: exercices }] = await Promise.all([
    admin.from("seances").select("*").eq("id", id).single(),
    admin
      .from("seance_exercices")
      .select("*, exercise:exercises(id,nom,groupe_musculaire,materiel,video_url,miniature_url)")
      .eq("seance_id", id)
      .order("ordre"),
  ]);

  return NextResponse.json({ seance, exercices: exercices ?? [] });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { nom, type_format, duree_estimee, description, image_url, exercices } = body;

  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: seance, error } = await admin
    .from("seances")
    .update({ nom: nom.trim(), type_format, duree_estimee: duree_estimee || null, description, image_url: image_url ?? null })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace exercices
  if (exercices !== undefined) {
    await admin.from("seance_exercices").delete().eq("seance_id", id);
    if (exercices.length) {
      // `ordre` encode le bloc (bloc * 10000 + position) : l'écraser par l'index
      // du tableau renvoie tous les exercices dans le premier bloc à la relecture.
      const rows = exercices.map((ex: Record<string, unknown>, i: number) => ({
        seance_id: id,
        exercise_id: ex.exercise_id,
        ordre: typeof ex.ordre === "number" ? ex.ordre : i,
        series: ex.series || null,
        repetitions: ex.repetitions || null,
        duree_secondes: ex.duree_secondes || null,
        temps_repos: ex.temps_repos ?? 60,
        notes: ex.notes || null,
      }));
      const { error: exError } = await admin.from("seance_exercices").insert(rows);
      if (exError) return NextResponse.json({ error: `Séance enregistrée mais exercices non sauvegardés : ${exError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ seance });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  if (isCoachOnly(user)) return NextResponse.json({ error: "Seul l'admin peut supprimer une séance." }, { status: 403 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("seances").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
