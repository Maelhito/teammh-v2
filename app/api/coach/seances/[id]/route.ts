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
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { nom, type_format, duree_estimee, description, exercices } = body;

  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: seance, error } = await admin
    .from("seances")
    .update({ nom: nom.trim(), type_format, duree_estimee: duree_estimee || null, description })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace exercices
  if (exercices !== undefined) {
    await admin.from("seance_exercices").delete().eq("seance_id", id);
    if (exercices.length) {
      const rows = exercices.map((ex: Record<string, unknown>, i: number) => ({
        seance_id: id,
        exercise_id: ex.exercise_id,
        ordre: i,
        series: ex.series || null,
        repetitions: ex.repetitions || null,
        duree_secondes: ex.duree_secondes || null,
        temps_repos: ex.temps_repos ?? 60,
        notes: ex.notes || null,
      }));
      await admin.from("seance_exercices").insert(rows);
    }
  }

  return NextResponse.json({ seance });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("seances").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
