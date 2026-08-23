import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import DashboardCoach from "./DashboardCoach";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans, semaineDans } from "@/lib/temps";
import { getFuseau } from "@/lib/temps-serveur";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && process.env.NODE_ENV !== "development") redirect("/login");

  const prenom = session?.user.user_metadata?.prenom
    ?? session?.user.email?.split("@")[0]
    ?? "Coach";
  const nom = session?.user.user_metadata?.nom ?? "";
  const coachUserId = session?.user.id ?? null;
  // Source unique du fuseau (voir lib/temps-serveur) — l'ancien
  // user_metadata.timezone n'était écrit par rien depuis longtemps.
  const timezone = coachUserId ? await getFuseau(coachUserId) : FUSEAU_PAR_DEFAUT;

  const admin = createSupabaseAdminClient();

  // ── Clientes actives ───────────────────────────────────────────────────────
  const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers({ perPage: 500 });
  const clientIds = users
    .filter(u => (u.user_metadata?.role ?? "cliente") === "cliente")
    .map(u => u.id);

  const { data: profiles } = clientIds.length
    ? await admin
        .from("user_profiles")
        .select("user_id, prenom, nom, statut")
        .in("user_id", clientIds)
        .eq("statut", "active")
    : { data: [] };

  const activeClients = (profiles ?? []).map(p => {
    const u = users.find(u => u.id === p.user_id);
    return {
      id: p.user_id,
      prenom: p.prenom ?? u?.user_metadata?.prenom ?? "",
      nom: p.nom ?? u?.user_metadata?.nom ?? "",
      email: u?.email ?? "",
      statut: p.statut,
    };
  });

  const activeIds = activeClients.map(c => c.id);

  // ── Stats semaine ──────────────────────────────────────────────────────────
  // "Aujourd'hui" et "cette semaine" dans le fuseau DU COACH : c'est lui qui
  // regarde cet écran, et ce sont ses propres journées de travail.
  const todayStr = aujourdhuiDans(timezone);
  const { lundi: mondayStr, dimanche: sundayStr } = semaineDans(timezone);

  // Séances effectuées cette semaine (event_type seance, date <= today)
  const { count: seancesCount } = activeIds.length
    ? await admin
        .from("calendar_events")
        .select("id", { count: "exact", head: true })
        .in("target_user_id", activeIds)
        .eq("event_type", "seance")
        .gte("date", mondayStr)
        .lte("date", todayStr)
    : { count: 0 };

  // ── Événements semaine du coach (créés par lui, hors séances + tâches) ─────
  // On filtre par user_id = coach → chaque coach voit uniquement SES rendez-vous
  const eventsQuery = coachUserId
    ? admin
        .from("calendar_events")
        .select("id, titre, date, heure, starts_at, event_type, target_user_id, lien")
        .eq("user_id", coachUserId)
        .not("event_type", "in", '("seance","tache")')
        .gte("date", mondayStr)
        .lte("date", sundayStr)
        .order("date")
        .order("heure", { nullsFirst: true })
    : null;

  const { data: weekEvents } = eventsQuery ? await eventsQuery : { data: [] };

  // Construction du label "Rendez-vous [prénom cliente]"
  const clientMap = Object.fromEntries(activeClients.map(c => [c.id, c]));

  const dedupedEvents = (weekEvents ?? []).map(ev => {
    const client = clientMap[ev.target_user_id];
    const clientName = client ? `${client.prenom} ${client.nom}`.trim() : "";
    return {
      ...ev,
      clientName,
      displayTitle: clientName ? `Rdv · ${clientName}` : ev.titre,
    };
  });

  return (
    <DashboardCoach
      prenom={prenom}
      nom={nom}
      today={todayStr}
      mondayStr={mondayStr}
      activeClients={activeClients}
      seancesCount={seancesCount ?? 0}
      weekEvents={dedupedEvents}
      timezone={timezone}
      coachUserId={coachUserId}
    />
  );
}
