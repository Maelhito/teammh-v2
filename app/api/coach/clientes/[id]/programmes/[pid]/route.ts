import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { adapterCles, decodeAssignment, type AssignmentRow, type MappingJours } from "@/lib/programme-planning";
import { programmeAcheve, totalSeancesPrevues } from "@/lib/programme-acheve";

type Params = { params: Promise<{ id: string; pid: string }> };

const SELECT = "*, programme:programmes(id, nom, niveau, duree_semaines, description)";
const STATUTS = new Set(["en_cours", "pause", "termine"]);

/**
 * Ce que le coach a le droit de réécrire dans `grid_data`. Tout le reste —
 * `seances_terminees`, `taches_done`… — est la progression de la cliente : il
 * est toujours relu en base, jamais repris de ce que le navigateur envoie.
 * Sinon une fiche ouverte depuis un moment effaçait, à la sauvegarde, une
 * séance que la cliente venait de valider.
 */
const CLES_COACH = ["grid", "duree_semaines", "note", "avancement", "cycle_prog"] as const;

function lireJson(texte: unknown): Record<string, unknown> {
  if (typeof texte !== "string" || !texte.startsWith("{")) return {};
  try { return JSON.parse(texte) as Record<string, unknown>; } catch { return {}; }
}

export async function GET(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id, pid } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("client_programmes")
    .select(SELECT)
    .eq("id", pid)
    .eq("user_id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

/**
 * Champs acceptés :
 * - `grid_data` : seules les clés de CLES_COACH en sont reprises, fusionnées
 *   dans le grid_data actuel en base.
 * - `grid_base` : la grille sur laquelle le coach a travaillé. Si la grille en
 *   base a changé depuis (la cliente a décalé une séance), on refuse plutôt que
 *   d'écraser son décalage.
 * - `jours_mapping` : réagencement des jours, appliqué aussi aux séances déjà
 *   validées (lues en base).
 * - `statut`, `seances_effectuees`, `date_debut`.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id, pid } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();

  const { data: actuel, error: lectureErr } = await admin
    .from("client_programmes")
    .select("id, grid_data")
    .eq("id", pid)
    .eq("user_id", id)
    .maybeSingle();
  if (lectureErr) return NextResponse.json({ error: lectureErr.message }, { status: 500 });
  if (!actuel) return NextResponse.json({ error: "Programme introuvable pour cette cliente." }, { status: 404 });

  const maj: Record<string, unknown> = {};

  if (body.statut !== undefined) {
    if (!STATUTS.has(body.statut)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    maj.statut = body.statut;
  }
  if (body.seances_effectuees !== undefined) {
    const n = Number(body.seances_effectuees);
    if (!Number.isInteger(n) || n < 0) return NextResponse.json({ error: "Nombre de séances invalide" }, { status: 400 });
    maj.seances_effectuees = n;
  }
  if (body.date_debut !== undefined) {
    if (typeof body.date_debut !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date_debut)) {
      return NextResponse.json({ error: "Date de début invalide" }, { status: 400 });
    }
    maj.date_debut = body.date_debut;
  }

  if (body.grid_data !== undefined) {
    const enBase = lireJson(actuel.grid_data);
    const envoye = typeof body.grid_data === "string" ? lireJson(body.grid_data) : (body.grid_data ?? {});

    if (body.grid_base !== undefined && JSON.stringify(enBase.grid ?? {}) !== JSON.stringify(body.grid_base ?? {})) {
      return NextResponse.json({
        error: "La cliente a modifié son programme entre-temps (séance décalée). Recharge la fiche puis refais ta modification.",
        conflit: true,
      }, { status: 409 });
    }

    const fusion: Record<string, unknown> = { ...enBase };
    for (const cle of CLES_COACH) {
      if (cle in envoye) fusion[cle] = envoye[cle];
    }
    if (body.jours_mapping && typeof body.jours_mapping === "object") {
      const mapping: MappingJours = Object.fromEntries(
        Object.entries(body.jours_mapping as Record<string, unknown>)
          .map(([source, cible]) => [parseInt(source), Number(cible)])
          .filter(([source, cible]) => source > 0 && cible >= 1 && cible <= 7),
      );
      const terminees = Array.isArray(enBase.seances_terminees) ? (enBase.seances_terminees as string[]) : [];
      fusion.seances_terminees = adapterCles(terminees, mapping);
    }
    maj.grid_data = JSON.stringify(fusion);
  }

  if (!Object.keys(maj).length) return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

  const { data, error } = await admin
    .from("client_programmes")
    .update(maj)
    .eq("id", pid)
    .eq("user_id", id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Même règle que côté cliente : le compteur qui rejoint le total clôt le
  // programme. Vaut pour « ✓ Séance faite », mais aussi quand le coach
  // raccourcit la durée jusqu'à ce que tout soit déjà fait.
  let assignment = data as AssignmentRow;
  if (assignment?.statut === "en_cours" && maj.statut !== "en_cours") {
    const d = decodeAssignment(assignment);
    if (programmeAcheve(assignment.seances_effectuees ?? 0, totalSeancesPrevues(d.grid, d.duree_semaines))) {
      const { data: clos } = await admin
        .from("client_programmes")
        .update({ statut: "termine" })
        .eq("id", pid)
        .eq("user_id", id)
        .select(SELECT)
        .single();
      if (clos) assignment = clos as AssignmentRow;
    }
  }

  return NextResponse.json({ assignment });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id, pid } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("client_programmes").delete().eq("id", pid).eq("user_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
