import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Une tâche vit 7 jours à partir de sa création, validée ou non : passé ce
// délai elle disparaît de l'accueil de la cliente (elle reste dans le calendrier).
const DUREE_DE_VIE_MS = 7 * 24 * 60 * 60 * 1000;

function limiteDeVie() {
  return new Date(Date.now() - DUREE_DE_VIE_MS).toISOString();
}

// GET — tâches encore en vie + leur état validé
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .select("id, titre, message, date, created_at, fait_le")
    .eq("target_user_id", session.user.id)
    .eq("event_type", "tache")
    .gte("created_at", limiteDeVie())
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    taches: (data ?? []).map((t) => ({
      id: t.id,
      titre: t.titre,
      message: t.message,
      done: t.fait_le !== null,
    })),
  });
}

// PATCH — valider / dévalider une tâche
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { taskId, done } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .update({ fait_le: done ? new Date().toISOString() : null })
    .eq("id", taskId)
    .eq("target_user_id", session.user.id)
    .eq("event_type", "tache")
    .gte("created_at", limiteDeVie())
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Tâche introuvable ou expirée" }, { status: 404 });
  return NextResponse.json({ success: true });
}
