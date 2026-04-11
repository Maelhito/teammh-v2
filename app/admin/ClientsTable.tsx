"use client";

import { useState } from "react";

export type Statut = "active" | "pause" | "terminee";
export type ProgrammeType = "N1" | "N2";
export type ProgrammeDuree = "16_semaines" | "6_mois" | "12_mois";

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
  programme_type: ProgrammeType;
  programme_duree: ProgrammeDuree;
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

// Combinaison programme_type + programme_duree en une valeur pour le select
type ProgrammeCombo = "N1" | "N2_6mois" | "N2_12mois";

function toCombo(type: ProgrammeType, duree: ProgrammeDuree): ProgrammeCombo {
  if (type === "N2" && duree === "6_mois") return "N2_6mois";
  if (type === "N2" && duree === "12_mois") return "N2_12mois";
  return "N1";
}

function fromCombo(combo: ProgrammeCombo): { programme_type: ProgrammeType; programme_duree: ProgrammeDuree } {
  if (combo === "N2_6mois") return { programme_type: "N2", programme_duree: "6_mois" };
  if (combo === "N2_12mois") return { programme_type: "N2", programme_duree: "12_mois" };
  return { programme_type: "N1", programme_duree: "16_semaines" };
}

const COMBO_LABELS: Record<ProgrammeCombo, string> = {
  N1: "N1 · 16s",
  N2_6mois: "N2 · 6m",
  N2_12mois: "N2 · 12m",
};

function ClientRow({
  client,
  onToggleAcces,
  onDisconnect,
  onUpdateProgramme,
}: {
  client: ClientData;
  onToggleAcces: (id: string, current: boolean) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onUpdateProgramme: (id: string, type: ProgrammeType, duree: ProgrammeDuree) => Promise<void>;
}) {
  const [acces, setAcces] = useState(client.acces_app);
  const [loadingAcces, setLoadingAcces] = useState(false);
  const [loadingDisconnect, setLoadingDisconnect] = useState(false);
  const [combo, setCombo] = useState<ProgrammeCombo>(
    toCombo(client.programme_type, client.programme_duree)
  );
  const [savingProg, setSavingProg] = useState(false);

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

  async function handleProgrammeChange(newCombo: ProgrammeCombo) {
    setCombo(newCombo);
    setSavingProg(true);
    const { programme_type, programme_duree } = fromCombo(newCombo);
    await onUpdateProgramme(client.id, programme_type, programme_duree);
    setSavingProg(false);
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
      <td style={{ ...tdStyle }}>
        <select
          value={combo}
          onChange={(e) => handleProgrammeChange(e.target.value as ProgrammeCombo)}
          disabled={savingProg}
          style={{
            backgroundColor: "#0D0D0D",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            padding: "4px 8px",
            color: combo === "N1" ? "#F5F5F0" : "#B22222",
            fontSize: 11,
            fontWeight: 700,
            cursor: savingProg ? "not-allowed" : "pointer",
            outline: "none",
          }}
        >
          {(Object.keys(COMBO_LABELS) as ProgrammeCombo[]).map((k) => (
            <option key={k} value={k} style={{ backgroundColor: "#1A1A1A" }}>
              {COMBO_LABELS[k]}
            </option>
          ))}
        </select>
      </td>
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

  async function handleUpdateProgramme(userId: string, programme_type: ProgrammeType, programme_duree: ProgrammeDuree) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "update_programme", programme_type, programme_duree }),
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
                  { label: "PROGRAMME", align: "left" as const },
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
                  onUpdateProgramme={handleUpdateProgramme}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
