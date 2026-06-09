import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Programme en cours de la cliente
  const { data: assignment, error } = await admin
    .from("client_programmes")
    .select("*, programme:programmes(id, nom, niveau, duree_semaines)")
    .eq("user_id", session.user.id)
    .eq("statut", "en_cours")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!assignment) return NextResponse.json({ programme: null });

  // Parser le grid_data
  let grid: Record<string, unknown[]> = {};
  let duree_semaines: number = assignment.programme?.duree_semaines ?? 4;
  let note = "";

  try {
    const src = assignment.grid_data ?? assignment.programme?.description ?? "";
    if (src?.startsWith("{")) {
      const parsed = JSON.parse(src);
      grid = parsed.grid ?? {};
      duree_semaines = parsed.duree_semaines ?? duree_semaines;
      note = parsed.note ?? "";
    }
  } catch {}

  // Calculer semaine courante
  const dateDebut = assignment.date_debut ? new Date(assignment.date_debut) : null;
  let semaine_courante = 1;
  if (dateDebut) {
    const diffDays = Math.floor((Date.now() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
    semaine_courante = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), duree_semaines);
  }

  return NextResponse.json({
    programme: {
      id: assignment.id,
      nom: assignment.programme?.nom ?? "Mon programme",
      niveau: assignment.programme?.niveau ?? "",
      date_debut: assignment.date_debut,
      statut: assignment.statut,
      semaine_courante,
      duree_semaines,
      note,
      grid,
    },
  });
}
