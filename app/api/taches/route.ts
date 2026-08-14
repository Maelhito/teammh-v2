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

  const [eventsRes, assignmentsRes] = await Promise.all([
    admin
      .from("calendar_events")
      .select("id, titre, message, date")
      .eq("target_user_id", session.user.id)
      .eq("event_type", "tache")
      .order("date", { ascending: true })
      .limit(5),
    // Plusieurs programmes peuvent être en cours : les tâches sont cochées sur le
    // programme "principal" (le plus ancien), mais on lit l'union pour ne jamais
    // perdre une coche posée sur un autre programme.
    admin
      .from("client_programmes")
      .select("id, grid_data")
      .eq("user_id", session.user.id)
      .eq("statut", "en_cours")
      .order("date_debut", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  const taches = eventsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];

  // Lire les IDs cochés depuis grid_data.taches_done
  const tachesDone = new Set<string>();
  for (const a of assignments) {
    try {
      const parsed = JSON.parse(a.grid_data ?? "{}");
      if (Array.isArray(parsed.taches_done)) parsed.taches_done.forEach((t: string) => tachesDone.add(t));
    } catch {}
  }
  const assignmentId = assignments[0]?.id ?? null;

  return NextResponse.json({
    taches: taches.map((t) => ({
      id: t.id,
      titre: t.titre,
      message: t.message,
      done: tachesDone.has(t.id),
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

  const { data: assignments } = await admin
    .from("client_programmes")
    .select("id, grid_data")
    .eq("user_id", session.user.id)
    .eq("statut", "en_cours")
    .order("date_debut", { ascending: true })
    .order("id", { ascending: true });

  const primary = assignments?.[0];
  if (!primary) return NextResponse.json({ error: "Aucun programme actif" }, { status: 404 });

  // Cocher → on écrit sur le programme principal.
  // Décocher → on retire la tâche de TOUS les programmes actifs, sinon l'union
  // relue par le GET la ferait réapparaître cochée.
  const targets = done ? [primary] : (assignments ?? []);

  for (const a of targets) {
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(a.grid_data ?? "{}"); } catch {}

    const current: string[] = Array.isArray(parsed.taches_done) ? [...(parsed.taches_done as string[])] : [];
    const next = done
      ? (current.includes(taskId) ? current : [...current, taskId])
      : current.filter((t) => t !== taskId);

    if (next.length === current.length) continue; // rien à changer ici

    await admin
      .from("client_programmes")
      .update({ grid_data: JSON.stringify({ ...parsed, taches_done: next }) })
      .eq("id", a.id);
  }

  return NextResponse.json({ success: true });
}
