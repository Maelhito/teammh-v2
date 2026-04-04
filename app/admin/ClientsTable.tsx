"use client";

import { useState } from "react";

export type Statut = "active" | "pause" | "terminee";

export interface ClientData {
  id: string;
  email: string;
  created_at: string;
  prenom: string | null;
  nom: string | null;
  statut: Statut;
  date_demarrage: string | null;
  completedCount: number;
  totalModules: number;
  acces_app: boolean;
}

function AccesDot({ acces }: { acces: boolean }) {
  return (
    <span
      title={acces ? "A accès à l'app" : "N'a pas accès à l'app"}
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: acces ? "#4ADE80" : "#F87171",
        flexShrink: 0,
        boxShadow: acces ? "0 0 6px rgba(74,222,128,0.5)" : "0 0 6px rgba(248,113,113,0.5)",
      }}
    />
  );
}

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "#F5F5F0",
  verticalAlign: "middle",
};

function btn(color: string, bg: string, disabled: boolean): React.CSSProperties {
  return {
    backgroundColor: bg,
    color: disabled ? "rgba(255,255,255,0.25)" : color,
    border: `1px solid ${color}40`,
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
  };
}

function ClientRow({
  client,
  onToggleAcces,
  onDisconnect,
}: {
  client: ClientData;
  onToggleAcces: (id: string, current: boolean) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}) {
  const [acces, setAcces] = useState(client.acces_app);
  const [loadingAcces, setLoadingAcces] = useState(false);
  const [loadingDisconnect, setLoadingDisconnect] = useState(false);

  async function handleToggle() {
    setLoadingAcces(true);
    await onToggleAcces(client.id, acces);
    setAcces(!acces);
    setLoadingAcces(false);
  }

  async function handleDisconnect() {
    setLoadingDisconnect(true);
    await onDisconnect(client.id);
    setLoadingDisconnect(false);
  }

  const dateDemarrage = client.date_demarrage
    ? new Date(client.date_demarrage).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
      <td style={tdStyle}>{client.nom ?? <span style={{ color: "#444", fontStyle: "italic" }}>—</span>}</td>
      <td style={tdStyle}>{client.prenom ?? <span style={{ color: "#444", fontStyle: "italic" }}>—</span>}</td>
      <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{client.email}</td>
      <td style={{ ...tdStyle, color: "rgba(255,255,255,0.45)", fontSize: 12, whiteSpace: "nowrap" }}>{dateDemarrage}</td>
      <td style={{ ...tdStyle, textAlign: "center" }}>
        <AccesDot acces={acces} />
      </td>
      <td style={{ ...tdStyle }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
          <button
            onClick={handleToggle}
            disabled={loadingAcces || loadingDisconnect}
            style={btn(
              acces ? "#F87171" : "#4ADE80",
              acces ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
              loadingAcces || loadingDisconnect
            )}
          >
            {loadingAcces ? "…" : acces ? "Révoquer" : "Donner accès"}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={loadingAcces || loadingDisconnect}
            style={btn("#FB923C", "rgba(251,146,60,0.1)", loadingAcces || loadingDisconnect)}
          >
            {loadingDisconnect ? "…" : "Déconnecter"}
          </button>
        </div>
      </td>
    </tr>
  );
}

interface Props {
  initialClients: ClientData[];
  fetchError?: string | null;
}

export default function ClientsTable({ initialClients, fetchError }: Props) {
  async function handleToggleAcces(userId: string, currentAcces: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "toggle_access", acces_app: !currentAcces }),
    });
  }

  async function handleDisconnect(userId: string) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "disconnect" }),
    });
  }

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0 }}>
          MES CLIENTES
        </h2>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>
          {initialClients.length} cliente{initialClients.length > 1 ? "s" : ""}
        </span>
      </div>

      {fetchError && (
        <div
          style={{
            backgroundColor: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 12, color: "#F87171", margin: 0, lineHeight: 1.5 }}>⚠ {fetchError}</p>
        </div>
      )}

      {!fetchError && initialClients.length === 0 ? (
        <p style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>Aucune cliente pour le moment.</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #1A1A1A" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#111111" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                {[
                  { label: "NOM", align: "left" as const },
                  { label: "PRÉNOM", align: "left" as const },
                  { label: "EMAIL", align: "left" as const },
                  { label: "DÉMARRAGE", align: "left" as const },
                  { label: "ACCÈS APP", align: "center" as const },
                  { label: "ACTIONS", align: "left" as const },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    style={{
                      padding: "10px 14px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#444",
                      letterSpacing: "0.05em",
                      textAlign: align,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onToggleAcces={handleToggleAcces}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
