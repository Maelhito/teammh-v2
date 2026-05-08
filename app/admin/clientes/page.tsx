import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { fetchClients } from "@/lib/admin/fetchClients";
import ClientsTable from "../ClientsTable";
import InviteForm from "../InviteForm";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const admin = createSupabaseAdminClient();
  const [{ clients, error }, { data: teamMembers }] = await Promise.all([
    fetchClients(),
    admin.from("team_members").select("id, nom, titre, role").order("created_at", { ascending: true }),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Gestion
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          👥 Clientes
        </h1>
      </div>

      <InviteForm />

      {error && (
        <div style={{ margin: "16px 0", padding: "10px 14px", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, fontSize: 12, color: "#F87171" }}>
          ⚠ {error}
        </div>
      )}

      <ClientsTable initialClients={clients} fetchError={error} teamMembers={teamMembers ?? []} />
    </div>
  );
}
