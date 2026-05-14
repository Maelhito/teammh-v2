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
    .from("client_programmes")
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;

  const { programme_id, date_debut, jours_selectionnes } = await req.json();
  if (!programme_id || !date_debut)
    return NextResponse.json({ error: "programme_id et date_debut requis." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Récupérer le programme template
  const { data: prog } = await admin.from("programmes").select("*").eq("id", programme_id).single();

  // Copier et remapper la grille selon les jours choisis
  let grid_data: string | null = null;
  if (prog?.description?.startsWith("{")) {
    try {
      const parsed = JSON.parse(prog.description);
      const originalGrid = parsed.grid ?? {};

      if (jours_selectionnes && Array.isArray(jours_selectionnes)) {
        // Détecter les jours actifs dans le programme (triés)
        const joursDansProg = Array.from(
          new Set(Object.keys(originalGrid).map(k => parseInt(k.match(/_J(\d+)$/)?.[1] ?? "0")).filter(j => j > 0))
        ).sort((a, b) => a - b) as number[];

        const joursChoisis = [...jours_selectionnes].sort((a, b) => a - b) as number[];

        // Remapper J_original[i] → J_choisi[i]
        const dayMap: Record<number, number> = {};
        joursDansProg.forEach((d, i) => { if (joursChoisis[i]) dayMap[d] = joursChoisis[i]; });

        const newGrid: Record<string, unknown> = {};
        for (const [key, items] of Object.entries(originalGrid)) {
          const m = key.match(/^S(\d+)_J(\d+)$/);
          if (!m) continue;
          const newJ = dayMap[parseInt(m[2])] ?? parseInt(m[2]);
          newGrid[`S${m[1]}_J${newJ}`] = items;
        }
        grid_data = JSON.stringify({ ...parsed, grid: newGrid });
      } else {
        grid_data = prog.description;
      }
    } catch {
      grid_data = prog?.description ?? null;
    }
  }

  // Mettre les précédents en_cours en pause
  await admin.from("client_programmes").update({ statut: "pause" }).eq("user_id", id).eq("statut", "en_cours");

  const { data, error } = await admin
    .from("client_programmes")
    .insert({ user_id: id, programme_id, date_debut, statut: "en_cours", grid_data })
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data }, { status: 201 });
}
