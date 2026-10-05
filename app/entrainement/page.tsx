import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import EntrainementClient from "./EntrainementClient";
import PreviewBanner from "@/components/PreviewBanner";
import { getEffectiveUser } from "@/lib/preview";
import { decodeAssignments, gridKeyToDate, parseLocalDate, semaineCourante, toLocalDateStr } from "@/lib/programme-planning";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";

export const dynamic = "force-dynamic";

export default async function EntrainementPage({
  searchParams,
}: {
  searchParams?: Promise<{ abandoned?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const abandonedKey = params?.abandoned ?? null;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  // Date du jour côté serveur (anti hydration-mismatch, voir EntrainementClient).
  // Dans le fuseau DE LA CLIENTE : sinon le serveur (UTC) affiche encore la
  // veille pour toute personne à l'est de Greenwich pendant sa matinée.
  const fuseau = userId ? await getFuseau(userId) : FUSEAU_PAR_DEFAUT;
  const todayIso = aujourdhuiDans(fuseau);

  // Une cliente peut avoir plusieurs programmes en cours simultanément
  // (programmation à l'avance) — on les charge tous et on les empile.
  let programmes: object[] = [];
  let rattrapages: object[] = [];
  let calendarEvents: object[] = [];

  if (userId) {
    const admin = createSupabaseAdminClient();

    const [assignmentsResult, eventsResult] = await Promise.all([
      admin
        .from("client_programmes")
        .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
        .eq("user_id", userId)
        .in("statut", ["en_cours", "termine"])
        .order("date_debut", { ascending: true }),
      admin
        .from("calendar_events")
        .select("*")
        .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
        .order("date", { ascending: true }),
    ]);

    calendarEvents = eventsResult.data ?? [];

    const decodes = decodeAssignments(assignmentsResult.data);
    const statuts = new Map((assignmentsResult.data ?? []).map((r: { id: string; statut: string }) => [r.id, r.statut]));

    programmes = decodes
      .filter((p) => statuts.get(p.id) === "en_cours")
      .map((p) => ({ ...p, semaine_courante: semaineCourante(p) }));

    // Séances jamais validées d'un programme clos (récent) : le programme peut
    // se fermer avant que la cliente ait tout fait, et ses séances manquées
    // disparaissaient alors du calendrier sans qu'elle puisse les décaler.
    const limite = new Date(`${todayIso}T00:00:00`);
    limite.setDate(limite.getDate() - 28);
    rattrapages = decodes
      .filter((p) => statuts.get(p.id) === "termine" && p.date_debut)
      .flatMap((p) => {
        const fin = parseLocalDate(p.date_debut as string);
        fin.setDate(fin.getDate() + p.duree_semaines * 7);
        if (fin < limite) return [];
        return Object.entries(p.grid)
          .filter(([key, items]) => (items ?? []).length > 0 && !p.seancesTerminees.includes(key))
          .map(([gridKey, items]) => ({
            assignmentId: p.id,
            gridKey,
            programmeNom: p.nom,
            prevueLe: (() => { const d = gridKeyToDate(gridKey, parseLocalDate(p.date_debut as string)); return d ? toLocalDateStr(d) : null; })(),
            items,
          }))
          .sort((a, b) => (a.prevueLe ?? "").localeCompare(b.prevueLe ?? ""));
      });
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
      <EntrainementClient programmes={programmes as any} initialEvents={calendarEvents as any} rattrapages={rattrapages as any} abandonedKey={abandonedKey} todayIso={todayIso} />
      <BottomNav />
    </div>
  );
}
