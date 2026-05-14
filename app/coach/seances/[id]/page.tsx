"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import SeanceBuilder, { CATEGORIES, NIVEAUX, decodeSeance, encodeSeance, type SeanceData } from "../SeanceBuilder";

const RECURRENCES = [
  { value: "une_seule_fois", label: "Une seule fois" },
  { value: "quotidien",      label: "Quotidien" },
  { value: "hebdomadaire",   label: "Hebdomadaire" },
];

export default function SeanceDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<SeanceData | null>(null);
  const [recurrence, setRecurrence] = useState("une_seule_fois");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach/seances/${id}`);
    const d = await res.json();
    if (d.seance) {
      setData(decodeSeance(d.seance, d.exercices ?? []));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!data) return;
    setError(""); setSaving(true);
    const { description, flat_exercices } = encodeSeance(data);
    const res = await fetch(`/api/coach/seances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: data.nom, type_format: "classique", duree_estimee: parseInt(data.duree_estimee) || null, description, exercices: flat_exercices }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); }
    else router.push("/coach/seances");
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #2a2a2a", backgroundColor: "#161616",
    fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui",
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, color: "#555",
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5,
    fontFamily: "system-ui",
  };

  if (!data) return <p style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>Chargement…</p>;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/coach/seances")}
            style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "7px 14px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>
            ← Retour
          </button>
          <div>
            <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 1px", fontFamily: "system-ui" }}>Modifier la séance</p>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>{data.nom || "Sans titre"}</h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "10px 24px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* ── Info section ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14, marginBottom: 20 }}>

        {/* Left: metadata */}
        <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #1a1a1a", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Nom de la séance</label>
            <input
              style={{ ...inp, fontSize: 15, fontWeight: 700, padding: "12px 14px" }}
              value={data.nom}
              onChange={e => setData(d => d ? { ...d, nom: e.target.value } : d)}
            />
          </div>

          <div>
            <label style={lbl}>Description</label>
            <textarea
              style={{ ...inp, minHeight: 72, resize: "vertical" } as React.CSSProperties}
              value={data.note}
              onChange={e => setData(d => d ? { ...d, note: e.target.value } : d)}
              placeholder="Description générale de la séance…"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Récurrence</label>
              <select style={{ ...inp, cursor: "pointer" }} value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Durée (min)</label>
              <input style={{ ...inp, textAlign: "center" }} type="number" min="1"
                value={data.duree_estimee}
                onChange={e => setData(d => d ? { ...d, duree_estimee: e.target.value } : d)} />
            </div>
            <div>
              <label style={lbl}>Catégorie</label>
              <select style={{ ...inp, cursor: "pointer" }} value={data.categorie}
                onChange={e => setData(d => d ? { ...d, categorie: e.target.value } : d)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Niveau</label>
              <select style={{ ...inp, cursor: "pointer" }} value={data.niveau}
                onChange={e => setData(d => d ? { ...d, niveau: e.target.value } : d)}>
                {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Right: image placeholder */}
        <div
          style={{ backgroundColor: "#111", borderRadius: 12, border: "1px dashed #2a2a2a", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", minHeight: 160, transition: "border-color 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3B82F6"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a"; }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>
          <p style={{ fontSize: 11, color: "#444", margin: 0, textAlign: "center", fontFamily: "system-ui" }}>Glissez une image ici</p>
          <button style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>
            Importer une image
          </button>
          <p style={{ fontSize: 9, color: "#2a2a2a", margin: 0, textAlign: "center", fontFamily: "system-ui" }}>PNG, JPG, WEBP — max 2 Mo</p>
        </div>
      </div>

      {/* ── Builder ── */}
      <SeanceBuilder data={data} onChange={setData} />
    </div>
  );
}
