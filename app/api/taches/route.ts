import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET — tâches de la semaine + état des cases cochées
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const [eventsRes, assignmentRes] = await Promise.all([
    admin
      .from("calendar_events")
      .select("id, titre, message, date")
      .eq("target_user_id", session.user.id)
      .eq("event_type", "tache")
      .order("date", { ascending: true })
      .limit(5),
    admin
      .from("client_programmes")
      .select("id, grid_data")
      .eq("user_id", session.user.id)
      .eq("statut", "en_cours")
      .limit(1)
      .maybeSingle(),
  ]);

  const taches = eventsRes.data ?? [];
  const assignment = assignmentRes.data;

  // Lire les IDs cochés depuis grid_data.taches_done
  let tachesDone: string[] = [];
  let assignmentId: string | null = null;
  if (assignment) {
    assignmentId = assignment.id;
    try {
      const parsed = JSON.parse(assignment.grid_data ?? "{}");
      tachesDone = Array.isArray(parsed.taches_done) ? parsed.taches_done : [];
    } catch {}
  }

  return NextResponse.json({
    taches: taches.map((t) => ({
      id: t.id,
      titre: t.titre,
      message: t.message,
      done: tachesDone.includes(t.id),
    })),
    assignmentId,
  });
}

// PATCH — toggle une tâche cochée
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { taskId, done } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: assignment } = await admin
    .from("client_programmes")
    .select("id, grid_data")
    .eq("user_id", session.user.id)
    .eq("statut", "en_cours")
    .limit(1)
    .maybeSingle();

  if (!assignment) return NextResponse.json({ error: "Aucun programme actif" }, { status: 404 });

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(assignment.grid_data ?? "{}"); } catch {}

  const tachesDone: string[] = Array.isArray(parsed.taches_done) ? [...parsed.taches_done] : [];

  if (done && !tachesDone.includes(taskId)) {
    tachesDone.push(taskId);
  } else if (!done) {
    const idx = tachesDone.indexOf(taskId);
    if (idx !== -1) tachesDone.splice(idx, 1);
  }

  await admin
    .from("client_programmes")
    .update({ grid_data: JSON.stringify({ ...parsed, taches_done: tachesDone }) })
    .eq("id", assignment.id);

  return NextResponse.json({ success: true, tachesDone });
}
