import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { coachPeutVoirCliente } from "@/lib/check-cliente-assignee";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { decodeAssignment, type AssignmentRow } from "@/lib/programme-planning";
import { programmeAcheve, totalSeancesPrevues } from "@/lib/programme-acheve";

type Params = { params: Promise<{ id: string; pid: string }> };

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
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .eq("id", pid)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id, pid } = await params;
  if (!(await coachPeutVoirCliente(user, id))) {
    return NextResponse.json({ error: "Cette cliente ne t'est pas attribuée." }, { status: 403 });
  }

  const body = await req.json();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("client_programmes")
    .update(body)
    .eq("id", pid)
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Même règle que côté cliente : le compteur qui rejoint le total clôt le
  // programme. Vaut pour « ✓ Séance faite », mais aussi quand le coach
  // raccourcit la durée jusqu'à ce que tout soit déjà fait.
  let assignment = data as AssignmentRow;
  if (assignment?.statut === "en_cours" && body?.statut !== "en_cours") {
    const d = decodeAssignment(assignment);
    if (programmeAcheve(assignment.seances_effectuees ?? 0, totalSeancesPrevues(d.grid, d.duree_semaines))) {
      const { data: clos } = await admin
        .from("client_programmes")
        .update({ statut: "termine" })
        .eq("id", pid)
        .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
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
  const { error } = await admin.from("client_programmes").delete().eq("id", pid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
