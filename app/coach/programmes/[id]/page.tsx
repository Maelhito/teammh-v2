"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ProgrammeBuilder, { encodeProgData, decodeProgData, type ProgrammeData } from "../ProgrammeBuilder";
import { CATEGORIES, NIVEAUX } from "../../seances/SeanceBuilder";

export default function EditProgrammePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<ProgrammeData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach/programmes/${id}`);
    const d = await res.json();
    if (d.programme) setData(decodeProgData(d.programme));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!data) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/coach/programmes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: data.nom, categorie: data.categorie, niveau: data.niveau,
        duree_semaines: data.duree_semaines,
        description: encodeProgData(data),
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); }
    else router.push("/coach/programmes");
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  if (!data) return <p style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>Chargement…</p>;

  const totalSeances = Object.values(data.grid).reduce((a, ids) => a + ids.length, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => router.push("/coach/programmes")} style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>← Retour</button>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>✏️ {data.nom}</h1>
      </div>

      {/* Infos */}
      <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #1a1a1a", padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 130px", gap: 12 }}>
          <div><label style={lbl}>Nom</label><input style={inp} value={data.nom} onChange={e => setData(d => d ? { ...d, nom: e.target.value } : d)} /></div>
          <div>
            <label style={lbl}>Catégorie</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.categorie} onChange={e => setData(d => d ? { ...d, categorie: e.target.value } : d)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Niveau</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.niveau} onChange={e => setData(d => d ? { ...d, niveau: e.target.value } : d)}>
              {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Durée</label>
            <select style={{ ...inp, cursor: "pointer" }} value={data.duree_semaines} onChange={e => setData(d => d ? { ...d, duree_semaines: parseInt(e.target.value) } : d)}>
              {[2,3,4,6,8,10,12,16,20,24].map(n => <option key={n} value={n}>{n} semaines</option>)}
            </select>
          </div>
        </div>
      </div>

      <ProgrammeBuilder data={data} onChange={setData} />

      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>{error}</p>}
      <button onClick={handleSave} disabled={saving}
        style={{ marginTop: 12, width: "100%", padding: "12px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
        {saving ? "Enregistrement…" : `✅ Sauvegarder (${totalSeances} séance${totalSeances > 1 ? "s" : ""} planifiée${totalSeances > 1 ? "s" : ""})`}
      </button>
    </div>
  );
}
