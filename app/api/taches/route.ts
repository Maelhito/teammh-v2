import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { limiteDeVieTache } from "@/lib/taches";
import { getFuseau } from "@/lib/temps-serveur";
import { aujourdhuiDans } from "@/lib/temps";
import { estRecurrente, lireTachesBrutes, occurrenceDeTache, tachesDuJour } from "@/lib/taches-serveur";

export const dynamic = "force-dynamic";

// GET — les tâches du jour : uniques encore en vie + récurrentes qui tombent aujourd'hui
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const fuseau = await getFuseau(session.user.id);
  const taches = await tachesDuJour(admin, session.user.id, fuseau, aujourdhuiDans(fuseau));

  return NextResponse.json({
    taches: taches.map((t) => ({
      id: t.id, titre: t.titre, message: t.message, done: t.done,
      recurrente: t.recurrente, rythme: t.rythme, heure: t.heure,
    })),
  });
}

// PATCH — valider / dévalider une tâche (une tâche récurrente, pour aujourd'hui seulement)
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { taskId, done } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const tache = (await lireTachesBrutes(admin, session.user.id)).find((t) => t.id === taskId);
  if (!tache) return NextResponse.json({ error: "Tâche introuvable ou expirée" }, { status: 404 });

  if (estRecurrente(tache)) {
    const fuseau = await getFuseau(session.user.id);
    const jour = aujourdhuiDans(fuseau);
    if (!occurrenceDeTache(tache, jour, fuseau).tombe) {
      return NextResponse.json({ error: "Cette tâche ne tombe pas aujourd'hui" }, { status: 404 });
    }
    const { error } = done
      ? await admin.from("taches_validations").upsert(
          { event_id: tache.id, user_id: session.user.id, jour, fait_le: new Date().toISOString() },
          { onConflict: "event_id,jour" }
        )
      : await admin.from("taches_validations").delete().eq("event_id", tache.id).eq("jour", jour);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (tache.created_at < limiteDeVieTache()) {
    return NextResponse.json({ error: "Tâche introuvable ou expirée" }, { status: 404 });
  }
  const { error } = await admin
    .from("calendar_events")
    .update({ fait_le: done ? new Date().toISOString() : null })
    .eq("id", taskId)
    .eq("target_user_id", session.user.id)
    .eq("event_type", "tache");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
