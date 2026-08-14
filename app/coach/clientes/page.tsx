import { fetchClients } from "@/lib/admin/fetchClients";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = { active: "Active", pause: "Pause", terminee: "Terminée" };
const STATUT_COLOR: Record<string, string> = { active: "#22C55E", pause: "#F97316", terminee: "#aaa" };

function clientLabel(c: { prenom: string | null; nom: string | null; email: string }) {
  return c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email;
}

export default async function CoachClientesPage() {
  const { clients, error } = await fetchClients();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Coach
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
          👥 Mes clientes
        </h1>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#ef4444", marginBottom: 16, fontFamily: "system-ui" }}>
          ⚠ {error}
        </div>
      )}

      {clients.length === 0 && !error && (
        <p style={{ color: "#aaa", fontSize: 14, fontFamily: "system-ui" }}>Aucune cliente pour le moment.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {clients.map(c => (
          <Link
            key={c.id}
            href={`/coach/clientes/${c.id}`}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              backgroundColor: "#fff", borderRadius: 12, padding: "14px 18px",
              border: "1px solid #e8e8e8", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              cursor: "pointer", transition: "border-color 0.15s",
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                backgroundColor: "#FEF2F2", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: "#B22222", fontFamily: "system-ui",
              }}>
                {clientLabel(c).charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
                  {clientLabel(c)}
                </p>
                <p style={{ fontSize: 12, color: "#aaa", margin: "2px 0 0", fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.email}
                </p>
              </div>

              {/* Statut */}
              <span style={{
                fontSize: 11, fontWeight: 600, color: STATUT_COLOR[c.statut],
                backgroundColor: `${STATUT_COLOR[c.statut]}20`,
                padding: "3px 10px", borderRadius: 20, flexShrink: 0, fontFamily: "system-ui",
              }}>
                {STATUT_LABEL[c.statut] ?? c.statut}
              </span>

              <span style={{ color: "#ccc", fontSize: 18, flexShrink: 0 }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
