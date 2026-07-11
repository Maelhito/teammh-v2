"use client";

import { useEffect, useState } from "react";
import { inputStyle, cardStyle, PageHeader } from "../TtsShared";

type Offre = "TTS" | "TTM" | "TTL";

interface Cliente {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  offre: Offre | null;
  date_debut: string | null;
}

const OFFRE_LABEL: Record<Offre, string> = { TTS: "Time To Start", TTM: "Time To Move", TTL: "Time To Last" };
const OFFRE_COLOR: Record<Offre, string> = { TTS: "#22C55E", TTM: "#3B82F6", TTL: "#B22222" };

interface DemandeBilan {
  id: string;
  user_id: string;
  message: string | null;
  created_at: string;
  prenom: string | null;
  nom: string | null;
}

export default function ClientesOffres() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [demandes, setDemandes] = useState<DemandeBilan[]>([]);
  const [demandesLoading, setDemandesLoading] = useState(true);

  const [pendingChange, setPendingChange] = useState<{ cliente: Cliente; offre: Offre } | null>(null);
  const [confirmStep, setConfirmStep] = useState(0); // 0 = pas de modale, 1 = modale 1, 2 = modale 2
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    loadDemandes();
  }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/tts/offres")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Erreur de chargement");
        setClientes(d.clients ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  function loadDemandes() {
    setDemandesLoading(true);
    fetch("/api/admin/tts/demandes-bilan")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Erreur de chargement des demandes de bilan");
        setDemandes(d.demandes ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement des demandes de bilan"))
      .finally(() => setDemandesLoading(false));
  }

  async function handleTraiter(id: string) {
    const res = await fetch("/api/admin/tts/demandes-bilan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setDemandes((prev) => prev.filter((d) => d.id !== id));
  }

  async function applyChange(cliente: Cliente, offre: Offre, confirmed: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tts/offres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: cliente.id, offre, confirmed }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Erreur");
        setPendingChange(null);
        setConfirmStep(0);
        return;
      }
      if (d.needsConfirmation) {
        setPendingChange({ cliente, offre });
        setConfirmStep(1);
        return;
      }
      setPendingChange(null);
      setConfirmStep(0);
      load();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  function handleSelectOffre(cliente: Cliente, offre: Offre) {
    if (cliente.offre === offre) return;
    applyChange(cliente, offre, false);
  }

  return (
    <div>
      <PageHeader title="Clientes Time To Start / Time To Last" subtitle="Affecter ou changer l'offre d'une cliente" />

      {!demandesLoading && demandes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#D97706" }}>
            🔔 {demandes.length} demande{demandes.length > 1 ? "s" : ""} de bilan en attente
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {demandes.map((d) => (
              <div key={d.id} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderColor: "#D97706" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--admin-text)" }}>
                    {d.prenom || d.nom ? `${d.prenom ?? ""} ${d.nom ?? ""}`.trim() : d.user_id}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-muted)" }}>
                    {d.message ?? "Demande de bilan"} · {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <button onClick={() => handleTraiter(d.id)} style={btnGhost}>Marquer traité</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Chargement...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {clientes.map((c) => (
            <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--admin-text)" }}>
                  {c.prenom || c.nom ? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() : c.email}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-muted)" }}>{c.email}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {c.offre && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                    backgroundColor: `${OFFRE_COLOR[c.offre]}22`, color: OFFRE_COLOR[c.offre],
                    border: `1px solid ${OFFRE_COLOR[c.offre]}`,
                  }}>
                    {OFFRE_LABEL[c.offre]}
                  </span>
                )}
                <select
                  value=""
                  disabled={saving}
                  onChange={(e) => {
                    const v = e.target.value as Offre;
                    if (v) handleSelectOffre(c, v);
                    e.target.value = "";
                  }}
                  style={{ ...inputStyle, width: "auto" }}
                >
                  <option value="">{c.offre ? "Changer d'offre…" : "Affecter une offre…"}</option>
                  {(["TTS", "TTM", "TTL"] as Offre[]).filter((o) => o !== c.offre).map((o) => (
                    <option key={o} value={o}>{OFFRE_LABEL[o]}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {clientes.length === 0 && (
            <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Aucune cliente.</p>
          )}
        </div>
      )}

      {/* Modale 1 : avertissement */}
      {confirmStep === 1 && pendingChange && (
        <Modal onClose={() => { setConfirmStep(0); setPendingChange(null); }}>
          <h3 style={{ margin: "0 0 10px", color: "var(--admin-text)" }}>⚠️ Changement hors de l&apos;ordre normal</h3>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
            Le parcours normal est <strong>TTS → TTM → TTL</strong>. Le passage de{" "}
            <strong>{pendingChange.cliente.offre ?? "—"}</strong> vers <strong>{pendingChange.offre}</strong> sort de cet ordre.
            Confirme que c&apos;est volontaire.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => { setConfirmStep(0); setPendingChange(null); }} style={btnGhost}>Annuler</button>
            <button onClick={() => setConfirmStep(2)} style={btnWarn}>Continuer</button>
          </div>
        </Modal>
      )}

      {/* Modale 2 : confirmation finale */}
      {confirmStep === 2 && pendingChange && (
        <Modal onClose={() => { setConfirmStep(0); setPendingChange(null); }}>
          <h3 style={{ margin: "0 0 10px", color: "var(--admin-text)" }}>Confirmer définitivement ?</h3>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
            {pendingChange.cliente.email} passera sur <strong>{OFFRE_LABEL[pendingChange.offre]}</strong>. Cette action sera enregistrée dans l&apos;historique.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => { setConfirmStep(0); setPendingChange(null); }} style={btnGhost}>Annuler</button>
            <button
              disabled={saving}
              onClick={() => applyChange(pendingChange.cliente, pendingChange.offre, true)}
              style={btnDanger}
            >
              {saving ? "..." : "Confirmer le changement"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth: 420, width: "90%" }}>
        {children}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "8px 14px", backgroundColor: "transparent", border: "1px solid var(--admin-border)",
  borderRadius: 8, color: "var(--admin-text-muted)", fontSize: 13, cursor: "pointer",
};
const btnWarn: React.CSSProperties = {
  padding: "8px 14px", backgroundColor: "#D97706", border: "none",
  borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  padding: "8px 14px", backgroundColor: "#B22222", border: "none",
  borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
