import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import SeanceViewer from "./SeanceViewer";

export const dynamic = "force-dynamic";

interface SearchParams { assignmentId?: string; gridKey?: string; itemIndex?: string; }

export default async function SeancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { assignmentId, gridKey, itemIndex } = await searchParams;
  if (!assignmentId || !gridKey) redirect("/entrainement");

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const admin = createSupabaseAdminClient();

  const { data: assignment } = await admin
    .from("client_programmes")
    .select("id, user_id, grid_data, programme:programmes(nom)")
    .eq("id", assignmentId)
    .eq("user_id", session.user.id)
    .single();

  if (!assignment) redirect("/entrainement");

  let seanceData = null;
  let seanceName = "";
  let seanceType: "locale" | "ref" = "locale";
  let seanceRefId: string | null = null;

  try {
    const parsed = JSON.parse(assignment.grid_data ?? "{}");
    const grid = parsed.grid ?? {};
    const items = grid[gridKey] ?? [];
    const idx = parseInt(itemIndex ?? "0") || 0;
    const item = items[idx];

    if (!item) redirect("/entrainement");

    if (item.type === "seance_locale") {
      seanceData = item.seanceData;
      seanceName = item.nom;
      seanceType = "locale";
    } else if (item.type === "seance") {
      seanceName = item.seanceName;
      seanceRefId = item.seanceId;
      seanceType = "ref";

      // Fetch exercises from DB
      const [seanceRes, exercicesRes] = await Promise.all([
        admin.from("seances").select("*").eq("id", item.seanceId).single(),
        admin
          .from("seance_exercices")
          .select("*, exercise:exercises(id,nom,groupe_musculaire,materiel,video_url,miniature_url)")
          .eq("seance_id", item.seanceId)
          .order("ordre"),
      ]);

      if (seanceRes.data) {
        seanceData = {
          nom: seanceRes.data.nom,
          categorie: seanceRes.data.type_format ?? "full_body",
          niveau: "debutant",
          duree_estimee: String(seanceRes.data.duree_estimee ?? ""),
          note: seanceRes.data.description ?? "",
          blocs: [{
            _key: "b1",
            type: "corps",
            nom: "Exercices",
            format: "classique",
            instructions: "",
            type_score: "",
            note_bloc: "",
            tabata_work: "20", tabata_rest: "10", tabata_tours: "8",
            tabata_exercices: [],
            emom_rounds: "10", emom_interval_min: "1", emom_interval_sec: "0",
            amrap_duree: "10", for_time_limit: "20",
            rich_exercices: (exercicesRes.data ?? []).map((ex) => ({
              _key: ex.id,
              exercise: ex.exercise,
              series: ex.series,
              repetitions: ex.repetitions,
              duree_secondes: ex.duree_secondes,
              temps_repos: ex.temps_repos,
              notes: ex.notes,
            })),
          }],
        };
      }
    }
  } catch {
    redirect("/entrainement");
  }

  if (!seanceData) redirect("/entrainement");

  return (
    <SeanceViewer
      assignmentId={assignmentId}
      gridKey={gridKey}
      seanceData={seanceData}
      seanceName={seanceName}
      nomProgramme={assignment.programme?.nom ?? ""}
    />
  );
}
