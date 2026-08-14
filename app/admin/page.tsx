import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";
import AdminAppLinks from "./AdminAppLinks";
import AdminWeekCalendar from "./AdminWeekCalendar";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay(); // 0=dim
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

async function getDashboardData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const admin = createSupabaseAdminClient();
  const weekDates = getWeekDates();
  const mondayStr = weekDates[0];
  const sundayStr = weekDates[6];

  const [authRes, profilesRes, completionsRes, eventsRes, teamRes] = await Promise.all([
    fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=500`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
    }),
    admin.from("user_profiles").select("user_id, statut, acces_app, role"),
    admin.from("module_completions").select("user_id"),
    admin.from("calendar_events")
      .select("id, titre, date, heure, event_type, target_user_id, user_id")
      .gte("date", mondayStr)
      .lte("date", sundayStr)
      .or('event_type.is.null,event_type.not.in.(seance,tache)')
      .order("heure", { nullsFirst: true }),
    admin.from("team_members").select("id, nom, role").order("created_at"),
  ]);

  const json = await authRes.json();
  const allUsers: { id: string; email?: string; created_at: string; user_metadata?: { prenom?: string; nom?: string; role?: string } }[] = json.users ?? json ?? [];

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.user_id, p]));
  const teamMembers = (teamRes.data ?? []) as { id: string; nom: string; role: "coach" | "nutrition" }[];

  // Stats globales
  const clients = allUsers.filter(u => u.email !== ADMIN_EMAIL && (profileMap[u.id]?.role ?? u.user_metadata?.role ?? "cliente") === "cliente");
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const profiles = profilesRes.data ?? [];

  const stats = {
    totalClients: clients.length,
    actives: profiles.filter(p => p.statut === "active" && p.acces_app && p.role !== "coach" && p.role !== "admin").length,
    enAttente: profiles.filter(p => !p.acces_app && p.role !== "coach" && p.role !== "admin").length,
    newThisWeek: clients.filter(u => new Date(u.created_at) > weekAgo).length,
    totalCompletions: (completionsRes.data ?? []).length,
    totalModules: getModules().length,
  };

  // Inscriptions de la semaine (par jour)
  const inscriptions = allUsers
    .filter(u => u.email !== ADMIN_EMAIL && u.created_at >= mondayStr)
    .map(u => {
      const role = profileMap[u.id]?.role ?? u.user_metadata?.role ?? "cliente";
      const prenom = u.user_metadata?.prenom ?? u.email?.split("@")[0] ?? "—";
      const nom = u.user_metadata?.nom ?? "";
      return {
        id: u.id,
        date: u.created_at.slice(0, 10),
        nom: `${prenom} ${nom}`.trim(),
        role: (role === "coach" ? "coach" : "cliente") as "cliente" | "coach",
      };
    })
    .filter(i => i.date >= mondayStr && i.date <= sundayStr);

  // Événements + enrichissement avec nom cliente et coach_team_id
  const clientMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  // Map user_id (auth) → team_member_id via user_metadata.team_member_ids
  const userToTeamIds: Record<string, string[]> = {};
  for (const u of allUsers) {
    const ids: string[] = ((u.user_metadata as Record<string, unknown> | undefined)?.team_member_ids as string[] | undefined) ?? [];
    if (ids.length) userToTeamIds[u.id] = ids;
  }

  const rawEvents = eventsRes.data ?? [];
  const events = rawEvents.map(ev => {
    const targetUser = ev.target_user_id ? clientMap[ev.target_user_id] : null;
    const prenom = targetUser?.user_metadata?.prenom ?? "";
    const nom = targetUser?.user_metadata?.nom ?? "";
    const target_name = prenom || nom ? `${prenom} ${nom}`.trim() : (targetUser?.email ?? "");

    // Identifier le coach via user_id de l'event → team_member_ids
    const coachTeamIds = ev.user_id ? (userToTeamIds[ev.user_id] ?? []) : [];
    // Choisir le bon team_member selon event_type
    let coach_team_id: string | null = null;
    if (coachTeamIds.length === 1) {
      coach_team_id = coachTeamIds[0];
    } else if (coachTeamIds.length > 1) {
      // Julie a coach + nutrition → matcher selon event_type
      const member = teamMembers.find(m =>
        coachTeamIds.includes(m.id) &&
        (ev.event_type === "nutrition" ? m.role === "nutrition" : m.role === "coach")
      );
      coach_team_id = member?.id ?? coachTeamIds[0];
    }

    return { ...ev, target_name, coach_team_id };
  });

  return { stats, events, inscriptions, teamMembers, weekDates };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const stats = data?.stats;

  const statCards = [
    { label: "Clientes au total",      value: stats?.totalClients ?? "—",      color: "var(--admin-text)", bg: "var(--admin-card2)", border: "var(--admin-border)" },
    { label: "Actives avec accès",     value: stats?.actives ?? "—",           color: "#4ADE80", bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.2)" },
    { label: "Sans accès app",         value: stats?.enAttente ?? "—",         color: "#F87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)" },
    { label: "Nouvelles cette semaine",value: stats?.newThisWeek ?? "—",       color: "#60A5FA", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.2)" },
    { label: "Modules complétés",      value: stats?.totalCompletions ?? "—",  color: "#A78BFA", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.2)" },
  ];

  const appLinks = [
    { href: "/inscription",            label: "Inscription cliente", desc: "À partager aux clientes",       color: "#B22222" },
    { href: "/inscription?role=coach", label: "Inscription coach",   desc: "Lien pour un nouveau coach",    color: "#F97316" },
    { href: "/admin",                  label: "Lien admin",          desc: "Espace administrateur",         color: "#3B82F6" },
    { href: "/coach",                  label: "App coach",           desc: "Portail coach (déjà inscrit)",  color: "#10B981" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, color: "var(--admin-text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "system-ui" }}>
          Bienvenue
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--admin-text)", margin: 0, letterSpacing: "-0.01em", fontFamily: "system-ui" }}>
          Tableau de bord
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 36 }}>
        {statCards.map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 16px" }}>
            <p style={{ fontSize: 26, fontWeight: 800, color, margin: "0 0 4px", fontFamily: "system-ui" }}>{value}</p>
            <p style={{ fontSize: 11, color: "#555", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Liens app — dépliables */}
      <AdminAppLinks links={appLinks} />

      {/* Calendrier hebdomadaire */}
      {data && (
        <AdminWeekCalendar
          events={data.events}
          inscriptions={data.inscriptions}
          teamMembers={data.teamMembers}
          weekDates={data.weekDates}
        />
      )}
    </div>
  );
}
