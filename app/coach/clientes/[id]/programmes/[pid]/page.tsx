"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ProgrammeBuilder, { encodeProgData, decodeProgData, type ProgrammeData } from "../../../../programmes/ProgrammeBuilder";
import { NIVEAUX } from "../../../../seances/SeanceBuilder";

export default function EditAssignmentPage() {
  const router = useRouter();
  const { id: clienteId, pid } = useParams() as { id: string; pid: string };
  const [data, setData] = useState<ProgrammeData | null>(null);
  const [nomCliente, setNomCliente] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const [assignRes, clientesRes] = await Promise.all([
        fetch(`/api/coach/clientes/${clienteId}/programmes/${pid}`),
        fetch("/api/coach/clientes"),
      ]);

      if (!assignRes.ok) {
        const d = await assignRes.json().catch(() => ({}));
        setLoadError(d.error ?? `Erreur ${assignRes.status}`);
        return;
      }

      const { assignment } = await assignRes.json();
      const { clientes } = await clientesRes.json().catch(() => ({ clientes: [] }));

      if (!assignment) { setLoadError("Assignation introuvable"); return; }

      const src = assignment.grid_data?.startsWith("{")
        ? { ...assignment.programme, description: assignment.grid_data }
        : assignment.programme;
      setData(decodeProgData(src));

      const cliente = (clientes ?? []).find((c: { id: string; prenom: string | null; nom: string | null; email: string }) => c.id === clienteId);
      if (cliente) setNomCliente([cliente.prenom, cliente.nom].filter(Boolean).join(" ") || cliente.email);
    } catch (e) {
      setLoadError(String(e));
    }
  }, [clienteId, pid]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!data) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/coach/clientes/${clienteId}/programmes/${pid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grid_data: encodeProgData(data) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Erreur");
      setSaving(false);
    } else {
      router.push(`/coach/clientes/${clienteId}`);
    }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  if (loadError) return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, color: "#EF4444", fontFamily: "system-ui", marginBottom: 12 }}>❌ {loadError}</p>
      <button onClick={() => router.push(`/coach/clientes/${clienteId}`)} style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #222", background: "none", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "system-ui" }}>← Retour</button>
    </div>
  );
  if (!data) return <p style={{ fontSize: 13, color: "#555", fontFamily: "system-ui", padding: 20 }}>Chargement…</p>;

  const totalItems = Object.values(data.grid).reduce((a, items) => a + items.length, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button
          onClick={() => router.push(`/coach/clientes/${clienteId}`)}
          style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}
        >
          ← Retour
        </button>
        <div>
          <p style={{ fontSize: 10, color: "#B22222", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui", fontWeight: 700 }}>
            Programme de {nomCliente}
          </p>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
            ✏️ {data.nom}
          </h1>
        </div>
      </div>

      {/* Infos du programme */}
      <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #1a1a1a", padding: "16px 18px", marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: "system-ui" }}>
          Programme personnalisé — modifications indépendantes du template
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Nom affiché</label>
            <input style={inp} value={data.nom} onChange={e => setData(d => d ? { ...d, nom: e.target.value } : d)} />
          </div>
          <div>
            <label style={lbl}>Niveau</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.niveau} onChange={e => setData(d => d ? { ...d, niveau: e.target.value } : d)}>
              {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Durée (semaines)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                style={{ ...inp, width: 70, textAlign: "center" }}
                type="number" min="1" max="24"
                value={data.duree_semaines}
                onChange={e => setData(d => d ? { ...d, duree_semaines: Math.min(24, Math.max(1, parseInt(e.target.value) || 1)) } : d)}
              />
              <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", whiteSpace: "nowrap" }}>
                semaine{data.duree_semaines > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grille complète */}
      <ProgrammeBuilder data={data} onChange={setData} />

      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}
      >
        {saving ? "Enregistrement…" : `✅ Sauvegarder les modifications (${totalItems} séance${totalItems > 1 ? "s" : ""})`}
      </button>
    </div>
  );
}
