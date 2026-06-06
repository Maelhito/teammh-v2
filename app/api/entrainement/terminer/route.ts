import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { updateStreak } from "@/lib/streak";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { assignmentId, gridKey } = await req.json();
  if (!assignmentId) return NextResponse.json({ error: "assignmentId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: assignment } = await admin
    .from("client_programmes")
    .select("id, seances_effectuees, grid_data, programme:programmes(description)")
    .eq("id", assignmentId)
    .eq("user_id", session.user.id)
    .single();

  if (!assignment) return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });

  // Lire le grid_data existant ou initialiser
  let gridData: Record<string, unknown> = {};
  try {
    const src = assignment.grid_data ?? (assignment.programme as { description?: string })?.description ?? "";
    if (src?.startsWith("{")) gridData = JSON.parse(src);
  } catch {}

  // Ajouter la séance terminée
  const terminees: string[] = Array.isArray(gridData.seances_terminees)
    ? (gridData.seances_terminees as string[])
    : [];
  if (gridKey && !terminees.includes(gridKey)) {
    terminees.push(gridKey);
  }
  gridData.seances_terminees = terminees;

  await admin
    .from("client_programmes")
    .update({
      seances_effectuees: (assignment.seances_effectuees ?? 0) + 1,
      grid_data: JSON.stringify(gridData),
    })
    .eq("id", assignmentId);

  const streak = await updateStreak(session.user.id);

  return NextResponse.json({ success: true, streak });
}
