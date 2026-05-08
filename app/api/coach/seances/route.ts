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

export async function GET() {
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data: seances, error } = await admin
    .from("seances")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compte les exercices de chaque séance
  const ids = (seances ?? []).map((s) => s.id);
  const { data: counts } = ids.length
    ? await admin
        .from("seance_exercices")
        .select("seance_id")
        .in("seance_id", ids)
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const c of counts ?? []) {
    countMap[c.seance_id] = (countMap[c.seance_id] ?? 0) + 1;
  }

  return NextResponse.json({
    seances: (seances ?? []).map((s) => ({
      ...s,
      exercices_count: countMap[s.id] ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await checkAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await req.json();
  const { nom, type_format, duree_estimee, description, exercices } = body;

  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Crée la séance
  const { data: seance, error } = await admin
    .from("seances")
    .insert({ nom: nom.trim(), type_format, duree_estimee: duree_estimee || null, description, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insère les exercices si présents
  if (exercices?.length) {
    const rows = exercices.map((ex: Record<string, unknown>, i: number) => ({
      seance_id: seance.id,
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

  return NextResponse.json({ seance }, { status: 201 });
}
