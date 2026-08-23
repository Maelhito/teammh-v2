import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculerSerie } from "@/lib/serie";
import { decodeAssignments } from "@/lib/programme-planning";
import { aujourdhuiDans } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";

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

  // Insérer dans seances_log
  const seanceName = (() => {
    try {
      const grid: Record<string, unknown> = JSON.parse(
        assignment.grid_data?.startsWith("{") ? assignment.grid_data
          : (assignment.programme as { description?: string })?.description ?? "{}"
      );
      const gridItems = (grid.grid as Record<string, Array<{ seanceName?: string; nom?: string; titre?: string }>> | undefined)?.[gridKey];
      const first = gridItems?.[0];
      if (!first) return null;
      return first.seanceName ?? first.nom ?? first.titre ?? null;
    } catch { return null; }
  })();

  const { data: logRow } = await admin
    .from("seances_log")
    .insert({
      user_id: session.user.id,
      assignment_id: assignmentId,
      grid_key: gridKey ?? null,
      seance_nom: seanceName,
    })
    .select("id")
    .single();

  // La série est recalculée APRÈS l'insertion, avec exactement la même règle que
  // l'écran d'accueil : les deux affichent forcément le même nombre.
  const [programmes, logs, fuseau] = await Promise.all([
    admin
      .from("client_programmes")
      .select("*, programme:programmes(nom, duree_semaines, description)")
      .eq("user_id", session.user.id)
      .in("statut", ["en_cours", "termine"])
      .order("date_debut", { ascending: true })
      .then((r) => decodeAssignments(r.data)),
    admin
      .from("seances_log")
      .select("id, grid_key, assignment_id")
      .eq("user_id", session.user.id)
      .then((r) => r.data ?? []),
    getFuseau(session.user.id),
  ]);

  const serie = calculerSerie(programmes, logs, aujourdhuiDans(fuseau));

  return NextResponse.json({
    success: true,
    serie: serie.serie,
    totalValidees: serie.totalValidees,
    jokers: serie.jokers,
    palierAtteint: serie.paliers.find(
      (p) => p.obtenu && ((p.mesure === "serie" && p.seuil === serie.serie) || (p.mesure === "seances" && p.seuil === serie.totalValidees))
    ) ?? null,
    logId: logRow?.id ?? null,
  });
}
