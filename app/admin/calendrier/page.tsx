import { fetchClients } from "@/lib/admin/fetchClients";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import CalendrierAdmin from "../CalendrierAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCalendrierPage() {
  const admin = createSupabaseAdminClient();
  const [{ clients }, { data: teamMembers }] = await Promise.all([
    fetchClients(),
    admin.from("team_members").select("id, nom, titre, role, lien_zoom").order("created_at"),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Planning
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          📅 Calendrier global
        </h1>
      </div>
      <CalendrierAdmin
        clients={clients.map(c => ({ id: c.id, email: c.email, prenom: c.prenom, nom: c.nom, coach_id: c.coach_id, nutrition_id: c.nutrition_id }))}
        teamMembers={(teamMembers ?? []) as { id: string; nom: string; titre: string; role: "coach" | "nutrition"; lien_zoom: string | null }[]}
      />
    </div>
  );
}
