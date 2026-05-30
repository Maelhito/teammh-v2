import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { assignmentId, fromKey, toKey } = await req.json();
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

  const grid = parsed.grid ?? {};
  const fromItems = grid[fromKey] ?? [];
  const toItems = grid[toKey] ?? [];

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
