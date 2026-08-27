import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { adapterGrille, decodeAssignment, joursDeLaGrille, mappingIdentite, type AssignmentRow, type MappingJours } from "@/lib/programme-planning";
import { programmeAcheve, totalSeancesPrevues } from "@/lib/programme-acheve";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("client_programmes")
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Rattrapage : les programmes assignés avant la clôture automatique sont
  // restés « en cours » alors que toutes leurs séances sont validées. On les
  // clôt ici plutôt que d'attendre un clic, sinon la fiche continue d'afficher
  // un programme en cours qui n'a plus rien à donner.
  const assignments = (data ?? []) as AssignmentRow[];
  const aClore = assignments.filter(a => {
    if (a.statut !== "en_cours") return false;
    const d = decodeAssignment(a);
    return programmeAcheve(a.seances_effectuees ?? 0, totalSeancesPrevues(d.grid, d.duree_semaines));
  });
  if (aClore.length) {
    await admin.from("client_programmes").update({ statut: "termine" }).in("id", aClore.map(a => a.id));
    for (const a of aClore) a.statut = "termine";
  }

  // Séances validées par la cliente. Le coach doit voir exactement ce que la
  // cliente voit dans son app : on renvoie donc la même source (seances_log),
  // et la fiche applique la même règle de correspondance.
  const { data: logs } = await admin
    .from("seances_log")
    .select("grid_key, assignment_id, seance_nom")
    .eq("user_id", id);

  return NextResponse.json({ assignments, seancesValidees: logs ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

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
