import { fetchClients } from "@/lib/admin/fetchClients";
import CalendrierAdmin from "../CalendrierAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCalendrierPage() {
  const { clients } = await fetchClients();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Planning
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          📅 Calendrier
        </h1>
      </div>
      <CalendrierAdmin clients={clients.map((c) => ({ id: c.id, email: c.email, prenom: c.prenom, nom: c.nom }))} />
    </div>
  );
}
