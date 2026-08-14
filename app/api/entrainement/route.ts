import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { decodeAssignments, semaineCourante } from "@/lib/programme-planning";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Tous les programmes en cours de la cliente (elle peut en avoir plusieurs :
  // programmation à l'avance, chacun avec sa propre date de début).
  const { data, error } = await admin
    .from("client_programmes")
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .eq("user_id", session.user.id)
    .eq("statut", "en_cours")
    .order("date_debut", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const programmes = decodeAssignments(data).map((p) => ({
    id: p.id,
    nom: p.nom,
    niveau: p.niveau,
    date_debut: p.date_debut,
    statut: "en_cours",
    semaine_courante: semaineCourante(p),
    duree_semaines: p.duree_semaines,
    note: p.note,
    grid: p.grid,
    seancesTerminees: p.seancesTerminees,
  }));

  return NextResponse.json({ programmes });
}
