import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import DashboardCoach from "./DashboardCoach";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans, decalerJour, semaineDans } from "@/lib/temps";
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

  // Les casquettes du coach : `coach_id` / `nutrition_id` d'une cliente
  // désignent un `team_members`, jamais un compte auth. Liste vide = admin,
  // qui voit tout le monde — même règle que la page « Mes clientes ».
  const teamMemberIds: string[] = session?.user?.user_metadata?.team_member_ids ?? [];

  // ── Clientes actives ───────────────────────────────────────────────────────
  const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers({ perPage: 500 });
  const clientIds = users
    .filter(u => (u.user_metadata?.role ?? "cliente") === "cliente")
    .map(u => u.id);

  const { data: tousProfils } = clientIds.length
    ? await admin
        .from("user_profiles")
        .select("user_id, prenom, nom, statut, coach_id, nutrition_id")
        .in("user_id", clientIds)
        .eq("statut", "active")
    : { data: [] };

  /** La cliente m'est-elle attribuée, et à quel titre ? */
  const estMaCliente = (p: { coach_id?: string | null; nutrition_id?: string | null }) =>
    teamMemberIds.length === 0
    || (!!p.coach_id && teamMemberIds.includes(p.coach_id))
    || (!!p.nutrition_id && teamMemberIds.includes(p.nutrition_id));

  // Le tableau de bord affichait TOUTES les clientes actives, y compris celles
  // d'un autre coach — le compteur comme la liste. « Mes clientes » filtrait
  // déjà correctement : les deux écrans se contredisaient.
  const profiles = (tousProfils ?? []).filter(estMaCliente);
  const profilParCliente = Object.fromEntries((tousProfils ?? []).map(p => [p.user_id, p]));

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

  // ── Événements de la semaine ──────────────────────────────────────────────
  // Le filtre était `user_id = coach` : un coach ne voyait que les rendez-vous
  // qu'il avait posés lui-même. Ceux que l'admin planifie POUR lui — le cas
  // courant — n'apparaissaient nulle part dans son agenda.
  //
  // La fenêtre est élargie d'un jour de chaque côté : `date` est la date murale
  // du fuseau de saisie, et un rendez-vous voisin du lundi ou du dimanche peut
  // basculer dans la semaine du coach une fois converti à son heure. Les jours
  // en trop sont ignorés à l'affichage, qui ne rend que les 7 colonnes.
  const eventsQuery = coachUserId
    ? admin
        .from("calendar_events")
        .select("id, titre, date, heure, starts_at, event_type, target_user_id, lien, user_id")
        .not("event_type", "in", '("seance","tache")')
        .gte("date", decalerJour(mondayStr, -1))
        .lte("date", decalerJour(sundayStr, 1))
        .order("date")
        .order("heure", { nullsFirst: true })
    : null;

  const { data: weekEventsBruts } = eventsQuery ? await eventsQuery : { data: [] };

  /**
   * Ce rendez-vous me concerne-t-il ?
   *
   * Soit je l'ai posé, soit il vise une cliente qui m'est attribuée — et par la
   * bonne casquette : un rendez-vous nutrition appartient à la nutritionniste,
   * pas au coach sportif de la même cliente.
   */
  const meConcerne = (ev: { user_id: string | null; target_user_id: string | null; event_type: string | null }) => {
    if (ev.user_id === coachUserId) return true;
    if (teamMemberIds.length === 0) return true; // admin : vue complète
    if (!ev.target_user_id) return false;        // diffusion à toutes
    const p = profilParCliente[ev.target_user_id];
    if (!p) return false;
    return ev.event_type === "nutrition"
      ? !!p.nutrition_id && teamMemberIds.includes(p.nutrition_id)
      : !!p.coach_id && teamMemberIds.includes(p.coach_id);
  };

  const weekEvents = (weekEventsBruts ?? []).filter(meConcerne);

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
