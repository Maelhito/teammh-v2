import InviteForm from "../InviteForm";
import RolesTable from "../RolesTable";

export const dynamic = "force-dynamic";

export default function AdminAccesPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Permissions
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          🔑 Accès & Rôles
        </h1>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 16px", fontFamily: "system-ui" }}>
          Inviter une nouvelle utilisatrice
        </h2>
        <InviteForm />
      </div>

      <RolesTable />
    </div>
  );
}
