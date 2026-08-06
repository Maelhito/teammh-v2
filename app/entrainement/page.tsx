import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import EntrainementClient from "./EntrainementClient";
import PreviewBanner from "@/components/PreviewBanner";
import { getEffectiveUser } from "@/lib/preview";

export const dynamic = "force-dynamic";

export default async function EntrainementPage({
  searchParams,
}: {
  searchParams?: Promise<{ abandoned?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const abandonedKey = params?.abandoned ?? null;
  // Date du jour côté serveur (anti hydration-mismatch, voir EntrainementClient)
  const todayIso = new Date().toISOString().slice(0, 10);

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  let programme = null;
  let calendarEvents: object[] = [];

  if (userId) {
    const admin = createSupabaseAdminClient();

    const [assignmentResult, eventsResult] = await Promise.all([
      admin
        .from("client_programmes")
        .select("*, programme:programmes(id, nom, niveau, duree_semaines)")
        .eq("user_id", userId)
        .eq("statut", "en_cours")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("calendar_events")
        .select("*")
        .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
        .order("date", { ascending: true }),
    ]);

    calendarEvents = eventsResult.data ?? [];

    const assignment = assignmentResult.data;
    if (assignment) {
      let grid: Record<string, unknown[]> = {};
      let duree_semaines: number = assignment.programme?.duree_semaines ?? 4;
      let note = "";

      let seancesTerminees: string[] = [];
      try {
        const src = assignment.grid_data ?? assignment.programme?.description ?? "";
        if (src?.startsWith("{")) {
          const parsed = JSON.parse(src);
          grid = parsed.grid ?? {};
          duree_semaines = parsed.duree_semaines ?? duree_semaines;
          note = parsed.note ?? "";
          seancesTerminees = Array.isArray(parsed.seances_terminees) ? parsed.seances_terminees : [];
        }
        // Si grid_data ne contient pas de grid, essayer programme.description séparément
        if (Object.keys(grid).length === 0 && assignment.grid_data) {
          const descSrc = assignment.programme?.description ?? "";
          if (descSrc?.startsWith("{")) {
            const parsed = JSON.parse(descSrc);
            grid = parsed.grid ?? {};
            duree_semaines = parsed.duree_semaines ?? duree_semaines;
            note = parsed.note ?? note;
          }
        }
      } catch {}

      const dateDebut = assignment.date_debut ? new Date(assignment.date_debut) : null;
      let semaine_courante = 1;
      if (dateDebut) {
        const diffDays = Math.floor((Date.now() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
        semaine_courante = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), duree_semaines);
      }

      programme = {
        id: assignment.id,
        nom: assignment.programme?.nom ?? "Mon programme",
        niveau: assignment.programme?.niveau ?? "",
        date_debut: assignment.date_debut,
        semaine_courante,
        duree_semaines,
        note,
        grid,
        seancesTerminees,
      };
    }
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      {isPreview && <PreviewBanner name={firstName} />}
      <AppHeader />
      <div style={{ padding: "60px 16px 16px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ display: "inline-block", width: 3, height: 20, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h1 className="font-title" style={{ fontSize: "1.6rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em", margin: 0 }}>
            MES SÉANCES
          </h1>
        </div>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EntrainementClient programme={programme} initialEvents={calendarEvents as any} abandonedKey={abandonedKey} todayIso={todayIso} />
      <BottomNav />
    </div>
  );
}
