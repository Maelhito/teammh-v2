import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import CalendrierCoach from "./CalendrierCoach";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CoachClientePage({ params }: Props) {
  const { id: clientId } = await params;
  const admin = createSupabaseAdminClient();

  const [
    { data: profile },
    { data: events },
    { data: programmes },
    { data: authData },
  ] = await Promise.all([
    admin.from("user_profiles").select("prenom, nom, statut").eq("user_id", clientId).maybeSingle(),
    admin
      .from("calendar_events")
      .select("*")
      .or(`target_user_id.eq.${clientId},and(user_id.eq.${clientId},created_by.eq.cliente)`)
      .order("date", { ascending: true }),
    admin.from("programmes").select("id, nom, duree_semaines").order("created_at", { ascending: false }),
    admin.auth.admin.getUserById(clientId),
  ]);

  const authUser = authData?.user;
  const clientNom =
    profile?.prenom && profile?.nom
      ? `${profile.prenom} ${profile.nom}`
      : authUser?.email ?? "Cliente";
  const clientEmail = authUser?.email ?? "";

  const statutColors: Record<string, string> = {
    active: "#22C55E", pause: "#F97316", terminee: "#aaa",
  };
  const statut = profile?.statut ?? "active";

  return (
    <div>
      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "system-ui" }}>
          <a href="/coach/clientes" style={{ color: "#aaa", textDecoration: "none" }}>Clientes</a>
          {" / "}
          {clientNom}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {clientNom}
          </h1>
          <span style={{ fontSize: 11, fontWeight: 600, color: statutColors[statut], backgroundColor: `${statutColors[statut]}20`, padding: "2px 8px", borderRadius: 20, fontFamily: "system-ui" }}>
            {statut}
          </span>
          <span style={{ fontSize: 12, color: "#aaa", fontFamily: "system-ui", marginLeft: "auto" }}>{clientEmail}</span>
        </div>
      </div>

      {/* Section title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2 }} />
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "system-ui" }}>
          Calendrier
        </h2>
      </div>

      <CalendrierCoach
        clientId={clientId}
        initialEvents={events ?? []}
        initialProgrammes={programmes ?? []}
      />
    </div>
  );
}
