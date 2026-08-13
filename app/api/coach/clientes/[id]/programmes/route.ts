import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { adapterGrille, joursDeLaGrille, mappingIdentite, type MappingJours } from "@/lib/programme-planning";

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

  const {
    programme_id,
    date_debut,
    jours_selectionnes,
    jours_mapping,
    duree_semaines,
    mettre_en_pause_les_autres,
  } = await req.json();
  if (!programme_id || !date_debut)
    return NextResponse.json({ error: "programme_id et date_debut requis." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Récupérer le programme template — il n'est JAMAIS modifié ici : on en fait
  // une copie dans grid_data, que le coach peut adapter pour cette cliente.
  const { data: prog } = await admin.from("programmes").select("*").eq("id", programme_id).single();

  let grid_data: string | null = null;
  if (prog?.description?.startsWith("{")) {
    try {
      const parsed = JSON.parse(prog.description);
      const originalGrid = (parsed.grid ?? {}) as Record<string, unknown[]>;
      const joursSource = joursDeLaGrille(originalGrid);

      // `jours_mapping` (jour source → jour cible) est la forme complète : un
      // jour source absent voit ses séances retirées. `jours_selectionnes` reste
      // accepté pour compat — remappage positionnel, sans suppression.
      let mapping: MappingJours;
      if (jours_mapping && typeof jours_mapping === "object") {
        mapping = Object.fromEntries(
          Object.entries(jours_mapping as Record<string, number>)
            .map(([source, cible]) => [parseInt(source), Number(cible)])
            .filter(([source, cible]) => source > 0 && cible >= 1 && cible <= 7),
        );
      } else if (Array.isArray(jours_selectionnes)) {
        const joursChoisis = [...jours_selectionnes].sort((a, b) => a - b) as number[];
        mapping = {};
        joursSource.forEach((d, i) => { mapping[d] = joursChoisis[i] ?? d; });
      } else {
        mapping = mappingIdentite(joursSource);
      }

      grid_data = JSON.stringify({
        ...parsed,
        grid: adapterGrille(originalGrid, mapping),
        // Durée propre à cette cliente (le template garde la sienne)
        duree_semaines:
          typeof duree_semaines === "number" && duree_semaines >= 1
            ? Math.min(52, Math.round(duree_semaines))
            : parsed.duree_semaines ?? prog.duree_semaines ?? 4,
      });
    } catch {
      grid_data = prog?.description ?? null;
    }
  }

  // Plusieurs programmes peuvent être "en_cours" simultanément (programmation à
  // l'avance : chaque assignation a sa propre date_debut, donc sa propre fenêtre).
  // On ne met les autres en pause que si le coach le demande explicitement.
  if (mettre_en_pause_les_autres) {
    await admin.from("client_programmes").update({ statut: "pause" }).eq("user_id", id).eq("statut", "en_cours");
  }

  const { data, error } = await admin
    .from("client_programmes")
    .insert({ user_id: id, programme_id, date_debut, statut: "en_cours", grid_data })
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data }, { status: 201 });
}
