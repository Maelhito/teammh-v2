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
}

const STATUT_LABEL: Record<Statut, string> = {
  active: "Active",
  pause: "En pause",
  terminee: "Terminée",
};

const STATUT_COLOR: Record<Statut, string> = {
  active: "#4ADE80",
  pause: "#FB923C",
  terminee: "#F87171",
};

const STATUT_BG: Record<Statut, string> = {
  active: "rgba(74,222,128,0.1)",
  pause: "rgba(251,146,60,0.1)",
  terminee: "rgba(248,113,113,0.1)",
};

function StatutBadge({ statut }: { statut: Statut }) {
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: STATUT_BG[statut],
        color: STATUT_COLOR[statut],
        border: `1px solid ${STATUT_COLOR[statut]}40`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {STATUT_LABEL[statut]}
    </span>
  );
}

function actionBtn(color: string, bg: string, disabled: boolean): React.CSSProperties {
  return {
    backgroundColor: bg,
    color: disabled ? "rgba(255,255,255,0.3)" : color,
    border: `1px solid ${color}40`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.03em",
  };
}

function ClientCard({
  client,
  onStatusChange,
}: {
  client: ClientData;
  onStatusChange: (id: string, statut: Statut) => Promise<void>;
}) {
  const [statut, setStatut] = useState<Statut>(client.statut);
  const [loading, setLoading] = useState<Statut | null>(null);

  const displayName =
    client.prenom || client.nom
      ? [client.prenom, client.nom].filter(Boolean).join(" ")
      : null;

  const inscription = new Date(client.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  async function handle(next: Statut) {
    setLoading(next);
    await onStatusChange(client.id, next);
    setStatut(next);
    setLoading(null);
  }

  return (
    <div
      style={{
        backgroundColor: "#1A1A1A",
        borderRadius: 12,
        border: "1px solid #2a2a2a",
        padding: "16px 18px",
      }}
    >
      {/* Nom + badge */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p
            className="font-body"
            style={{
              fontWeight: 700,
              fontSize: "0.9rem",
              color: displayName ? "#F5F5F0" : "#555",
              lineHeight: 1.2,
              marginBottom: 2,
              fontStyle: displayName ? "normal" : "italic",
            }}
          >
            {displayName ?? "Sans nom"}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {client.email}
          </p>
        </div>
        <StatutBadge statut={statut} />
      </div>

      {/* Infos */}
      <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.04em", marginBottom: 2 }}>INSCRIPTION</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{inscription}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.04em", marginBottom: 2 }}>MODULES</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{client.completedCount}</span>
            {" / "}{client.totalModules}
          </p>
        </div>
        {client.date_demarrage && (
          <div>
            <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.04em", marginBottom: 2 }}>DÉMARRAGE</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {new Date(client.date_demarrage).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        )}
      </div>

      {/* Barre progression */}
      <div style={{ height: 4, backgroundColor: "#0D0D0D", borderRadius: 2, overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            height: "100%",
            width: `${client.totalModules > 0 ? (client.completedCount / client.totalModules) * 100 : 0}%`,
            backgroundColor: "#B22222",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(statut === "pause" || statut === "terminee") && (
          <button onClick={() => handle("active")} disabled={loading !== null} style={actionBtn("#4ADE80", "rgba(74,222,128,0.12)", loading !== null)}>
            {loading === "active" ? "…" : "Réactiver"}
          </button>
        )}
        {statut === "active" && (
          <button onClick={() => handle("pause")} disabled={loading !== null} style={actionBtn("#FB923C", "rgba(251,146,60,0.1)", loading !== null)}>
            {loading === "pause" ? "…" : "Pause"}
          </button>
        )}
        {(statut === "active" || statut === "pause") && (
          <button onClick={() => handle("terminee")} disabled={loading !== null} style={actionBtn("#F87171", "rgba(248,113,113,0.1)", loading !== null)}>
            {loading === "terminee" ? "…" : "Terminer"}
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  initialClients: ClientData[];
}

export default function ClientsTable({ initialClients }: Props) {
  async function handleStatusChange(userId: string, statut: Statut) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, statut }),
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

      {initialClients.length === 0 ? (
        <p style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>Aucune cliente pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {initialClients.map((client) => (
            <ClientCard key={client.id} client={client} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
