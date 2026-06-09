import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import CalendrierClient from "./CalendrierClient";

export const dynamic = "force-dynamic";

type CellItem = { type: string; seanceName?: string; nom?: string; titre?: string; duree?: number | null };

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CalendrierPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id ?? "";

  let events: object[] = [];
  let completedSeances: { grid_key: string | null; assignment_id: string | null; nom: string | null }[] = [];

  if (userId) {
    const admin = createSupabaseAdminClient();

    // 1) Événements "non séance" (coach, nutrition, tâche, coaching de groupe, perso…) depuis calendar_events
    const { data: rawEvents } = await admin
      .from("calendar_events")
      .select("*")
      .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
      .neq("event_type", "seance")
      .order("date", { ascending: true });

    const otherEvents: object[] = rawEvents ?? [];

    // 2) Séances : générées directement depuis la grille du/des programme(s) assigné(s)
    //    (même source que la vue coach), pour rester toujours synchronisé.
    const { data: assignments } = await admin
      .from("client_programmes")
      .select("id, date_debut, grid_data, programme:programmes(description)")
      .eq("user_id", userId)
      .in("statut", ["en_cours", "termine"]);

    const seanceEvents: object[] = [];

    for (const assignment of assignments ?? []) {
      if (!assignment.date_debut) continue;

      let grid: Record<string, CellItem[]> = {};
      try {
        const src = assignment.grid_data ?? (assignment.programme as { description?: string } | null)?.description ?? "";
        if (typeof src === "string" && src.startsWith("{")) {
          grid = JSON.parse(src).grid ?? {};
        }
      } catch {}

      const startDate = new Date(assignment.date_debut + "T00:00:00");

      for (const [key, items] of Object.entries(grid)) {
        const match = key.match(/^S(\d+)_J(\d+)$/);
        if (!match) continue;
        const semaine = parseInt(match[1]);
        const jour = parseInt(match[2]);

        for (const item of items) {
          if (item.type !== "seance" && item.type !== "seance_locale") continue;
          const nom = item.seanceName ?? item.nom ?? item.titre ?? "Séance";

          const d = new Date(startDate);
          d.setDate(d.getDate() + (semaine - 1) * 7 + (jour - 1));

          seanceEvents.push({
            id: `grid-${assignment.id}-${key}`,
            titre: nom,
            date: toLocalDateStr(d),
            heure: null,
            recurrence: "none",
            message: null,
            lien: null,
            created_by: "admin",
            event_type: "seance",
            user_id: null,
            target_user_id: userId,
            team_member_id: null,
            grid_key: key,
            assignment_id: assignment.id,
          });
        }
      }
    }

    events = [...otherEvents, ...seanceEvents];

    // 3) Séances validées par la cliente (note post-séance) — matching exact via grid_key + assignment_id
    const { data: logs } = await admin
      .from("seances_log")
      .select("seance_nom, grid_key, assignment_id")
      .eq("user_id", userId);

    completedSeances = (logs ?? []).map((l) => ({
      grid_key: (l.grid_key as string | null) ?? null,
      assignment_id: (l.assignment_id as string | null) ?? null,
      nom: (l.seance_nom as string | null) ?? null,
    }));
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader />

      <div style={{ padding: "60px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ display: "inline-block", width: 3, height: 20, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h1 className="font-title" style={{ fontSize: "1.6rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em", margin: 0 }}>
            CALENDRIER
          </h1>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CalendrierClient userId={userId} initialEvents={events as any} completedSeances={completedSeances} />

      <BottomNav />
    </div>
  );
}
