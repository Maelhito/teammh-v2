"use client";

import { useEffect, useMemo, useState } from "react";
import { OFFRE_COLOR, OFFRE_ORDER, PHASE_COLOR, PHASE_LABEL, type Offre, type Phase } from "@/lib/offers/types";
import {
  ORDRES_CLIENTES, ORDRE_PAR_DEFAUT, normaliseOrdre, trierClientesPar,
  type OrdreClientes,
} from "@/lib/tri-clientes";
export type { Offre, Phase };

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
  coach_id: string | null;
  nutrition_id: string | null;
  offre: Offre | null;
  phase: Phase;
}

export interface TeamMember {
  id: string;
  nom: string;
  titre: string;
  role: "coach" | "nutrition";
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
  teamMembers,
  onToggleAcces,
  onDisconnect,
  onDelete,
  onUpdateProgramme,
  onUpdateTeam,
  onUpdateOffre,
  onUpdatePhase,
}: {
  client: ClientData;
  teamMembers: TeamMember[];
  onToggleAcces: (id: string, current: boolean) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateProgramme: (id: string, type: ProgrammeType, duree: ProgrammeDuree) => Promise<void>;
  onUpdateTeam: (id: string, field: "coach_id" | "nutrition_id", value: string | null) => Promise<void>;
  onUpdateOffre: (id: string, current: Offre | null, next: Offre) => Promise<boolean>;
  onUpdatePhase: (id: string, next: Phase) => Promise<boolean>;
}) {
  const [acces, setAcces] = useState(client.acces_app);
  const [loadingAcces, setLoadingAcces] = useState(false);
  const [loadingDisconnect, setLoadingDisconnect] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [combo, setCombo] = useState<ProgrammeCombo>(
    toCombo(client.programme_type, client.programme_duree)
  );
  const [savingProg, setSavingProg] = useState(false);
  const [coachId, setCoachId] = useState<string>(client.coach_id ?? "");
  const [nutritionId, setNutritionId] = useState<string>(client.nutrition_id ?? "");
  const [offre, setOffre] = useState<Offre | null>(client.offre);
  const [savingOffre, setSavingOffre] = useState(false);
  const [phase, setPhase] = useState<Phase>(client.phase);
  const [savingPhase, setSavingPhase] = useState(false);
  const coaches = teamMembers.filter((m) => m.role === "coach");
  const nutritionists = teamMembers.filter((m) => m.role === "nutrition");

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

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement ${client.prenom ?? client.email} ? Cette action est irréversible.`)) return;
    setLoadingDelete(true);
    await onDelete(client.id);
    setLoadingDelete(false);
  }

  async function handleProgrammeChange(newCombo: ProgrammeCombo) {
    setCombo(newCombo);
    setSavingProg(true);
    const { programme_type, programme_duree } = fromCombo(newCombo);
    await onUpdateProgramme(client.id, programme_type, programme_duree);
    setSavingProg(false);
  }

  async function handleCoachChange(val: string) {
    setCoachId(val);
    await onUpdateTeam(client.id, "coach_id", val || null);
  }

  async function handleNutritionChange(val: string) {
    setNutritionId(val);
    await onUpdateTeam(client.id, "nutrition_id", val || null);
  }

  async function handleOffreChange(val: string) {
    if (!val || val === offre) return;
    setSavingOffre(true);
    const ok = await onUpdateOffre(client.id, offre, val as Offre);
    if (ok) setOffre(val as Offre);
    setSavingOffre(false);
  }

  async function handlePhaseToggle() {
    const next: Phase = phase === "demarrage" ? "demarree" : "demarrage";
    setSavingPhase(true);
    const ok = await onUpdatePhase(client.id, next);
    if (ok) setPhase(next);
    setSavingPhase(false);
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
      <td style={{ ...tdStyle }}>
        <select
          value={coachId}
          onChange={(e) => handleCoachChange(e.target.value)}
          style={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(178,34,34,0.4)", borderRadius: 6, padding: "4px 8px", color: coachId ? "#F5F5F0" : "#555", fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none" }}
        >
          <option value="">—</option>
          {coaches.map((m) => <option key={m.id} value={m.id} style={{ backgroundColor: "#1A1A1A" }}>{m.nom}</option>)}
        </select>
      </td>
      <td style={{ ...tdStyle }}>
        <select
          value={nutritionId}
          onChange={(e) => handleNutritionChange(e.target.value)}
          style={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 6, padding: "4px 8px", color: nutritionId ? "#F5F5F0" : "#555", fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none" }}
        >
          <option value="">—</option>
          {nutritionists.map((m) => <option key={m.id} value={m.id} style={{ backgroundColor: "#1A1A1A" }}>{m.nom}</option>)}
        </select>
      </td>
      <td style={{ ...tdStyle }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
          <select
            value={offre ?? ""}
            onChange={(e) => handleOffreChange(e.target.value)}
            disabled={savingOffre}
            style={{
              backgroundColor: "#0D0D0D",
              border: `1px solid ${offre ? `${OFFRE_COLOR[offre]}66` : "rgba(255,255,255,0.15)"}`,
              borderRadius: 6,
              padding: "4px 8px",
              color: offre ? OFFRE_COLOR[offre] : "#555",
              fontSize: 11,
              fontWeight: 700,
              cursor: savingOffre ? "not-allowed" : "pointer",
              outline: "none",
            }}
          >
            <option value="" style={{ backgroundColor: "#1A1A1A" }}>—</option>
            {OFFRE_ORDER.map((o) => (
              <option key={o} value={o} style={{ backgroundColor: "#1A1A1A" }}>{o}</option>
            ))}
          </select>
          {/* Phase de démarrage — clic pour basculer démarrage ⇄ démarrée */}
          <button
            onClick={handlePhaseToggle}
            disabled={savingPhase}
            title={
              phase === "demarrage"
                ? "Cliquer pour activer l'accès complet (fin du démarrage)"
                : "Cliquer pour repasser en phase de démarrage (modules verrouillés)"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              backgroundColor: `${PHASE_COLOR[phase]}1A`,
              border: `1px solid ${PHASE_COLOR[phase]}66`,
              borderRadius: 6,
              padding: "3px 8px",
              color: PHASE_COLOR[phase],
              fontSize: 10,
              fontWeight: 700,
              cursor: savingPhase ? "not-allowed" : "pointer",
              opacity: savingPhase ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: PHASE_COLOR[phase], display: "inline-block", flexShrink: 0 }} />
            {savingPhase ? "…" : PHASE_LABEL[phase]}
          </button>
        </div>
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
            disabled={loadingAcces || loadingDisconnect || loadingDelete}
            style={btn("#FB923C", "rgba(251,146,60,0.1)", loadingAcces || loadingDisconnect || loadingDelete)}
          >
            {loadingDisconnect ? "…" : "Déconnecter"}
          </button>
          <button
            onClick={handleDelete}
            disabled={loadingAcces || loadingDisconnect || loadingDelete}
            style={btn("#F87171", "rgba(248,113,113,0.1)", loadingAcces || loadingDisconnect || loadingDelete)}
          >
            {loadingDelete ? "…" : "🗑 Supprimer"}
          </button>
        </div>
      </td>
    </tr>
  );
}

interface Props {
  initialClients: ClientData[];
  fetchError?: string | null;
  teamMembers: TeamMember[];
}

/** Ce qui est comparé pour les tris alphabétiques : la colonne NOM d'abord,
 *  puis le prénom, et l'e-mail pour celles dont l'état civil manque. */
function libelleTri(c: ClientData): string {
  return [c.nom, c.prenom].filter(Boolean).join(" ") || c.email;
}

const CLE_ORDRE = "admin-clientes-ordre";

export default function ClientsTable({ initialClients, fetchError, teamMembers }: Props) {
  const [clients, setClients] = useState(initialClients);
  const [ordre, setOrdre] = useState<OrdreClientes>(ORDRE_PAR_DEFAUT);

  // Le choix est relu au montage, pas au premier rendu : le serveur ne connaît
  // pas le localStorage, et rendre autre chose que lui casserait l'hydratation.
  useEffect(() => {
    try { setOrdre(normaliseOrdre(localStorage.getItem(CLE_ORDRE))); } catch {}
  }, []);

  function changerOrdre(v: OrdreClientes) {
    setOrdre(v);
    try { localStorage.setItem(CLE_ORDRE, v); } catch {}
  }

  const clientsTries = useMemo(
    () => trierClientesPar(clients, ordre, libelleTri),
    [clients, ordre],
  );

  async function handleToggleAcces(userId: string, currentAcces: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "toggle_access", acces_app: !currentAcces }),
    });
    // La ligne rejoint le bas de la liste (ou en remonte) immédiatement :
    // sinon il fallait recharger la page pour retrouver l'ordre annoncé.
    if (res.ok) {
      setClients(prev => prev.map(c => (c.id === userId ? { ...c, acces_app: !currentAcces } : c)));
    }
  }

  async function handleDisconnect(userId: string) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "disconnect" }),
    });
  }

  async function handleDelete(userId: string) {
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) setClients((prev) => prev.filter((c) => c.id !== userId));
  }

  async function handleUpdateProgramme(userId: string, programme_type: ProgrammeType, programme_duree: ProgrammeDuree) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "update_programme", programme_type, programme_duree }),
    });
  }

  async function handleUpdateTeam(userId: string, field: "coach_id" | "nutrition_id", value: string | null) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "update_team", [field]: value }),
    });
  }

  async function handleUpdateOffre(userId: string, current: Offre | null, next: Offre): Promise<boolean> {
    const res = await fetch("/api/admin/offres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, offre: next, confirmed: false }),
    });
    const d = await res.json();
    if (res.ok) return true;
    if (d.needsConfirmation) {
      const step1 = confirm(`⚠️ Changement hors de l'ordre normal TTS → TTM → TTL.\nPassage de ${current ?? "—"} vers ${next}. Continuer ?`);
      if (!step1) return false;
      const step2 = confirm(`Confirmer définitivement le passage vers ${next} ? Cette action sera enregistrée dans l'historique.`);
      if (!step2) return false;
      const res2 = await fetch("/api/admin/offres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, offre: next, confirmed: true }),
      });
      return res2.ok;
    }
    return false;
  }

  async function handleUpdatePhase(userId: string, next: Phase): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/offres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, phase: next }),
      });
      if (res.ok) return true;
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Erreur : la phase n'a pas pu être changée.");
      return false;
    } catch {
      alert("Erreur réseau : la phase n'a pas pu être changée, réessaie.");
      return false;
    }
  }

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0 }}>
          MES CLIENTES
        </h2>
        <span style={{ fontSize: 12, color: "#555" }}>
          {initialClients.length} cliente{initialClients.length > 1 ? "s" : ""}
        </span>

        {/* Choix de l'ordre — à droite, retenu d'une visite à l'autre */}
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
            TRIER PAR
          </span>
          <select
            value={ordre}
            onChange={(e) => changerOrdre(normaliseOrdre(e.target.value))}
            style={{
              backgroundColor: "#0D0D0D",
              border: `1px solid ${ordre === ORDRE_PAR_DEFAUT ? "rgba(255,255,255,0.15)" : "#B22222"}`,
              borderRadius: 6,
              padding: "6px 10px",
              color: "#F5F5F0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              fontFamily: "system-ui",
            }}
          >
            {ORDRES_CLIENTES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p style={{ fontSize: 11, color: "#444", margin: "-12px 0 16px", fontStyle: "italic" }}>
        Les accès révoqués restent en bas de liste, quel que soit le tri.
      </p>

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

      {!fetchError && clientsTries.length === 0 ? (
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
                  { label: "🔴 COACH", align: "left" as const },
                  { label: "🟢 NUTRITION", align: "left" as const },
                  { label: "OFFRE", align: "left" as const },
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
              {clientsTries.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  teamMembers={teamMembers}
                  onToggleAcces={handleToggleAcces}
                  onDisconnect={handleDisconnect}
                  onDelete={handleDelete}
                  onUpdateProgramme={handleUpdateProgramme}
                  onUpdateTeam={handleUpdateTeam}
                  onUpdateOffre={handleUpdateOffre}
                  onUpdatePhase={handleUpdatePhase}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
