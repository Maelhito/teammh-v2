import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { decodeSeance } from "@/lib/seance-format";
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
        // La structure réelle (blocs, descriptions, mouvements) est stockée en
        // JSON dans seances.description. L'ancienne version la jetait et
        // reconstruisait un bloc unique depuis seance_exercices : la cliente ne
        // voyait ni les descriptions ni les exercices non-tabata.
        seanceData = decodeSeance(seanceRes.data, exercicesRes.data ?? []);
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
      nomProgramme={(assignment.programme as unknown as { nom: string } | null)?.nom ?? ""}
    />
  );
}
