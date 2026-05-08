import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const prenom = session.user.user_metadata?.prenom
    ?? session.user.email?.split("@")[0]
    ?? "Coach";

  const admin = createSupabaseAdminClient();

  // Nombre de clientes assignées à ce coach (via user_profiles.coach_id lié au team_member)
  const { count: clientesCount } = await admin
    .from("user_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("statut", "active");

  // Événements de la semaine en cours
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const { count: seancesCount } = await admin
    .from("calendar_events")
    .select("id", { count: "exact", head: true })
    .gte("date", fmt(monday))
    .lte("date", fmt(sunday));

  const stats = [
    { label: "Clientes actives", value: clientesCount ?? 0, color: "#B22222" },
    { label: "Séances cette semaine", value: seancesCount ?? 0, color: "#3B82F6" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: "#999", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Bonjour,
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", letterSpacing: "-0.01em" }}>
          {prenom} 👋
        </h1>
        <p style={{ fontSize: 14, color: "#888", margin: "6px 0 0", fontFamily: "system-ui" }}>
          Bienvenue dans ton espace coach Time to Move
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: "#fff", borderRadius: 14,
            padding: "20px 22px", border: "1px solid #e8e8e8",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <p style={{ fontSize: 28, fontWeight: 800, color, margin: "0 0 4px", fontFamily: "system-ui" }}>
              {value}
            </p>
            <p style={{ fontSize: 12, color: "#999", margin: 0, fontFamily: "system-ui", letterSpacing: "0.02em" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Accès rapides */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "20px 22px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "system-ui" }}>
          Accès rapides
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            { href: "/coach/clientes",   label: "Mes clientes",     icon: "👥" },
            { href: "/coach/seances",    label: "Séances",          icon: "📋" },
            { href: "/coach/programmes", label: "Programmes",       icon: "📅" },
            { href: "/coach/exercices",  label: "Exercices",        icon: "🏋️" },
          ].map(({ href, label, icon }) => (
            <a key={href} href={href} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 8, padding: "18px 12px", borderRadius: 10,
              border: "1px solid #f0f0f0", backgroundColor: "#fafafa",
              textDecoration: "none", color: "#1a1a1a",
              fontSize: 12, fontWeight: 600, fontFamily: "system-ui",
              letterSpacing: "0.02em", textAlign: "center",
              transition: "border-color 0.15s, background 0.15s",
            }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
