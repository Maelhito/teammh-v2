import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

async function getStats() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const admin = createSupabaseAdminClient();

  try {
    const [authRes, profilesRes, completionsRes] = await Promise.all([
      fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=500`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: "no-store",
      }),
      admin.from("user_profiles").select("user_id, statut, acces_app, date_demarrage"),
      admin.from("module_completions").select("user_id"),
    ]);

    const json = await authRes.json();
    const allUsers: { id: string; email?: string; created_at: string }[] = json.users ?? json ?? [];
    const clients = allUsers.filter((u) => u.email !== ADMIN_EMAIL);

    const profiles = profilesRes.data ?? [];
    const actives = profiles.filter((p) => p.statut === "active" && p.acces_app).length;
    const enAttente = profiles.filter((p) => !p.acces_app).length;

    // Nouvelles inscriptions cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = clients.filter((u) => new Date(u.created_at) > weekAgo).length;

    const completions = completionsRes.data ?? [];
    const totalModules = getModules().length;

    return {
      totalClients: clients.length,
      actives,
      enAttente,
      newThisWeek,
      totalCompletions: completions.length,
      totalModules,
    };
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    { label: "Clientes au total",     value: stats?.totalClients ?? "—",   color: "#F5F5F0", bg: "#161616", border: "#222" },
    { label: "Actives avec accès",    value: stats?.actives ?? "—",        color: "#4ADE80", bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.2)" },
    { label: "Sans accès app",        value: stats?.enAttente ?? "—",      color: "#F87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)" },
    { label: "Nouvelles cette semaine",value: stats?.newThisWeek ?? "—",   color: "#60A5FA", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.2)" },
    { label: "Modules complétés",     value: stats?.totalCompletions ?? "—", color: "#A78BFA", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.2)" },
  ];

  const quickLinks = [
    { href: "/admin/clientes",      icon: "👥", label: "Gérer les clientes",    desc: "Accès, programmes, équipe" },
    { href: "/admin/modules",       icon: "📚", label: "Gérer les modules",      desc: "Vidéos, documents, contenu" },
    { href: "/admin/calendrier",    icon: "📅", label: "Calendrier",             desc: "Événements et séances" },
    { href: "/admin/equipe",        icon: "🤝", label: "Mon équipe",             desc: "Coachs et nutritionnistes" },
    { href: "/admin/notifications", icon: "🔔", label: "Notifications",          desc: "Envoyer des push" },
    { href: "/admin/acces",         icon: "🔑", label: "Accès & Rôles",          desc: "Rôles et permissions" },
  ];

  const appLinks = [
    { href: "/inscription", label: "Lien inscription", desc: "À partager aux clientes", color: "#B22222" },
    { href: "/admin",       label: "Lien admin",       desc: "Espace administrateur",  color: "#3B82F6" },
    { href: "/coach",       label: "Lien coach",       desc: "Portail coach",           color: "#10B981" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "system-ui" }}>
          Bienvenue
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#F5F5F0", margin: 0, letterSpacing: "-0.01em", fontFamily: "system-ui" }}>
          Tableau de bord
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 36 }}>
        {statCards.map(({ label, value, color, bg, border }) => (
          <div key={label} style={{
            backgroundColor: bg, border: `1px solid ${border}`,
            borderRadius: 12, padding: "18px 16px",
          }}>
            <p style={{ fontSize: 26, fontWeight: 800, color, margin: "0 0 4px", fontFamily: "system-ui" }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: "#555", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Liens de l'app */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px", fontFamily: "system-ui" }}>
          Liens de l&apos;application
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {appLinks.map(({ href, label, desc, color }) => (
            <Link key={href} href={href} style={{
              display: "block", padding: "14px 16px", borderRadius: 10, textDecoration: "none",
              backgroundColor: "#111", border: `1px solid ${color}30`,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color, margin: "0 0 2px", fontFamily: "system-ui" }}>{label}</p>
              <p style={{ fontSize: 11, color: "#555", margin: "0 0 6px", fontFamily: "system-ui" }}>{desc}</p>
              <code style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>
                teammj-v2.vercel.app{href}
              </code>
            </Link>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 11, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: "system-ui" }}>
          Sections
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {quickLinks.map(({ href, icon, label, desc }) => (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "16px 18px", borderRadius: 12, textDecoration: "none",
              backgroundColor: "#111", border: "1px solid #1a1a1a",
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F5F5F0", margin: "0 0 2px", fontFamily: "system-ui" }}>{label}</p>
                <p style={{ fontSize: 11, color: "#555", margin: 0, fontFamily: "system-ui" }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
