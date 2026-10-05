import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { assignmentId, fromKey, toKey, toAssignmentId } = await req.json();
  if (!assignmentId || !fromKey || !toKey) {
    return NextResponse.json({ error: "assignmentId, fromKey et toKey requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Vérifier que l'assignation appartient à cet utilisateur
  const { data: assignment, error: fetchErr } = await admin
    .from("client_programmes")
    .select("id, grid_data, user_id")
    .eq("id", assignmentId)
    .eq("user_id", session.user.id)
    .single();

  if (fetchErr || !assignment) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  let parsed: { grid: Record<string, unknown[]>; [k: string]: unknown };
  try {
    parsed = JSON.parse(assignment.grid_data ?? "{}");
  } catch {
    return NextResponse.json({ error: "grid_data invalide" }, { status: 400 });
  }

  // Aucune limite de date (une séance passée non faite se décale), mais une séance
  // déjà validée reste en place : sa validation est rattachée à sa case.
  const terminees = Array.isArray(parsed.seances_terminees) ? (parsed.seances_terminees as string[]) : [];
  if (terminees.includes(fromKey)) {
    return NextResponse.json({ error: "Cette séance est déjà validée" }, { status: 409 });
  }

  const grid = parsed.grid ?? {};
  const fromItems = grid[fromKey] ?? [];
  const toItems = grid[toKey] ?? [];

  // Rattrapage : la séance passe d'un programme clos vers un programme en cours.
  if (toAssignmentId && toAssignmentId !== assignmentId) {
    const { data: cible } = await admin
      .from("client_programmes")
      .select("id, grid_data")
      .eq("id", toAssignmentId)
      .eq("user_id", session.user.id)
      .eq("statut", "en_cours")
      .single();
    if (!cible) return NextResponse.json({ error: "Programme cible introuvable" }, { status: 404 });

    let cibleParsed: { grid?: Record<string, unknown[]>; [k: string]: unknown };
    try {
      cibleParsed = JSON.parse(cible.grid_data ?? "{}");
    } catch {
      return NextResponse.json({ error: "grid_data cible invalide" }, { status: 400 });
    }
    const cibleGrid = cibleParsed.grid ?? {};
    cibleGrid[toKey] = [...(cibleGrid[toKey] ?? []), ...fromItems];
    grid[fromKey] = [];

    // Cible d'abord : si la seconde écriture échoue, la séance existe en double
    // plutôt que de disparaître.
    const { error: errCible } = await admin
      .from("client_programmes")
      .update({ grid_data: JSON.stringify({ ...cibleParsed, grid: cibleGrid }) })
      .eq("id", toAssignmentId)
      .eq("user_id", session.user.id);
    if (errCible) return NextResponse.json({ error: errCible.message }, { status: 500 });

    const { error: errSource } = await admin
      .from("client_programmes")
      .update({ grid_data: JSON.stringify({ ...parsed, grid }) })
      .eq("id", assignmentId)
      .eq("user_id", session.user.id);
    if (errSource) return NextResponse.json({ error: errSource.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Déplacer les items de fromKey vers toKey
  grid[toKey] = [...toItems, ...fromItems];
  grid[fromKey] = [];

  const { error: updateErr } = await admin
    .from("client_programmes")
    .update({ grid_data: JSON.stringify({ ...parsed, grid }) })
    .eq("id", assignmentId)
    .eq("user_id", session.user.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
