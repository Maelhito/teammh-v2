"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SeanceBuilder, { CATEGORIES, NIVEAUX, defaultBloc, encodeSeance, type SeanceData } from "../SeanceBuilder";

const initData = (): SeanceData => ({
  nom: "", categorie: "full_body", niveau: "debutant", duree_estimee: "60", note: "",
  blocs: [defaultBloc("echauffement"), defaultBloc("corps", 1)],
});

const RECURRENCES = [
  { value: "une_seule_fois", label: "Une seule fois" },
  { value: "quotidien",      label: "Quotidien" },
  { value: "hebdomadaire",   label: "Hebdomadaire" },
];

export default function NouvelleSeancePage() {
  const router = useRouter();
  const [seanceData, setSeanceData] = useState<SeanceData>(initData());
  const [recurrence, setRecurrence] = useState("une_seule_fois");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(k: keyof SeanceData, v: string) {
    setSeanceData(d => ({ ...d, [k]: v }));
  }

  async function handleSave() {
    if (!seanceData.nom.trim()) { setError("Le nom de la séance est obligatoire."); return; }
    setError(""); setSaving(true);
    try {
      const { description, flat_exercices } = encodeSeance(seanceData);
      const res = await fetch("/api/coach/seances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: seanceData.nom,
          type_format: "classique",
          duree_estimee: parseInt(seanceData.duree_estimee) || null,
          description,
          exercices: flat_exercices,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur"); setSaving(false); return; }
      router.push("/coach/seances");
    } catch { setError("Impossible de contacter le serveur."); setSaving(false); }
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
            <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 1px", fontFamily: "system-ui" }}>Nouvelle séance</p>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
              {seanceData.nom.trim() || "Sans titre"}
            </h1>
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
          {/* Nom */}
          <div>
            <label style={lbl}>Nom de la séance *</label>
            <input
              style={{ ...inp, fontSize: 15, fontWeight: 700, padding: "12px 14px" }}
              value={seanceData.nom}
              onChange={e => update("nom", e.target.value)}
              placeholder="Ex : Full Body Débutant — Semaine 1"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label style={lbl}>Description</label>
            <textarea
              style={{ ...inp, minHeight: 72, resize: "vertical" } as React.CSSProperties}
              value={seanceData.note}
              onChange={e => update("note", e.target.value)}
              placeholder="Description générale de la séance…"
            />
          </div>

          {/* Row: Récurrence · Durée · Catégorie · Niveau */}
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
                value={seanceData.duree_estimee} onChange={e => update("duree_estimee", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Catégorie</label>
              <select style={{ ...inp, cursor: "pointer" }} value={seanceData.categorie} onChange={e => update("categorie", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Niveau</label>
              <select style={{ ...inp, cursor: "pointer" }} value={seanceData.niveau} onChange={e => update("niveau", e.target.value)}>
                {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Right: image upload */}
        <div
          style={{ backgroundColor: "#111", borderRadius: 12, border: "1px dashed #2a2a2a", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", minHeight: 160, transition: "border-color 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3B82F6"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a"; }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>
          <p style={{ fontSize: 11, color: "#444", margin: 0, textAlign: "center", fontFamily: "system-ui" }}>Glissez une image ici</p>
          <p style={{ fontSize: 10, color: "#2a2a2a", margin: 0, fontFamily: "system-ui" }}>ou</p>
          <button style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>
            Importer une image
          </button>
          <p style={{ fontSize: 9, color: "#2a2a2a", margin: 0, textAlign: "center", fontFamily: "system-ui" }}>PNG, JPG, WEBP — max 2 Mo</p>
        </div>
      </div>

      {/* ── Builder ── */}
      <SeanceBuilder data={seanceData} onChange={setSeanceData} />
    </div>
  );
}
