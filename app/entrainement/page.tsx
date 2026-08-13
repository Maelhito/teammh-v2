import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import EntrainementClient from "./EntrainementClient";
import PreviewBanner from "@/components/PreviewBanner";
import { getEffectiveUser } from "@/lib/preview";
import { decodeAssignments, semaineCourante } from "@/lib/programme-planning";

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

  // Une cliente peut avoir plusieurs programmes en cours simultanément
  // (programmation à l'avance) — on les charge tous et on les empile.
  let programmes: object[] = [];
  let calendarEvents: object[] = [];

  if (userId) {
    const admin = createSupabaseAdminClient();

    const [assignmentsResult, eventsResult] = await Promise.all([
      admin
        .from("client_programmes")
        .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
        .eq("user_id", userId)
        .eq("statut", "en_cours")
        .order("date_debut", { ascending: true }),
      admin
        .from("calendar_events")
        .select("*")
        .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
        .order("date", { ascending: true }),
    ]);

    calendarEvents = eventsResult.data ?? [];

    programmes = decodeAssignments(assignmentsResult.data).map((p) => ({
      ...p,
      semaine_courante: semaineCourante(p),
    }));
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
      <EntrainementClient programmes={programmes as any} initialEvents={calendarEvents as any} abandonedKey={abandonedKey} todayIso={todayIso} />
      <BottomNav />
    </div>
  );
}
