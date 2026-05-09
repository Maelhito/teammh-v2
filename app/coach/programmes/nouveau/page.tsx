"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgrammeBuilder, { encodeProgData, type ProgrammeData } from "../ProgrammeBuilder";
import { CATEGORIES, NIVEAUX } from "../../seances/SeanceBuilder";

const init = (): ProgrammeData => ({
  nom: "", categorie: "full_body", niveau: "debutant",
  duree_semaines: 4, note: "", grid: {},
});

export default function NouveauProgrammePage() {
  const router = useRouter();
  const [step, setStep] = useState<1|2>(1);
  const [data, setData] = useState<ProgrammeData>(init());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/coach/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: data.nom, categorie: data.categorie, niveau: data.niveau,
          duree_semaines: data.duree_semaines,
          description: encodeProgData(data),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur"); setSaving(false); return; }
      router.push("/coach/programmes");
    } catch { setError("Impossible de contacter le serveur."); setSaving(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui" };
  const sel: React.CSSProperties = { ...inp, cursor: "pointer" };

  const totalSeances = Object.values(data.grid).reduce((a, ids) => a + ids.length, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => step === 1 ? router.push("/coach/programmes") : setStep(1)}
          style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>
          ← Retour
        </button>
        <div>
          <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 1px", fontFamily: "system-ui" }}>Nouveau programme</p>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
            {step === 1 ? "Informations" : data.nom}
          </h1>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        {[{n:1,l:"Infos"},{n:2,l:"Planification"}].map(({n,l},i) => (
          <div key={n} style={{ display:"flex", alignItems:"center" }}>
            {i > 0 && <div style={{ width: 40, height: 2, backgroundColor: step > 1 ? "#B22222" : "#222" }} />}
            <div style={{ display:"flex", alignItems:"center", gap:6, cursor: n<step ? "pointer" : "default" }} onClick={() => n<step && setStep(n as 1|2)}>
              <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor: step>=n?"#B22222":"#1a1a1a", color: step>=n?"#fff":"#555", fontSize:10, fontWeight:700, fontFamily:"system-ui" }}>{n}</div>
              <span style={{ fontSize:11, fontWeight: step===n?700:400, color: step===n?"#F5F5F0":"#555", fontFamily:"system-ui" }}>{l}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Étape 1 */}
      {step === 1 && (
        <div style={{ backgroundColor: "#111", borderRadius: 14, border: "1px solid #1a1a1a", padding: "24px", maxWidth: 560 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={lbl}>Nom du programme *</label><input style={inp} value={data.nom} onChange={e => setData(d => ({ ...d, nom: e.target.value }))} placeholder="Ex: Programme Remise en Forme 8 semaines" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Catégorie</label>
                <select style={sel} value={data.categorie} onChange={e => setData(d => ({ ...d, categorie: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Niveau</label>
                <select style={sel} value={data.niveau} onChange={e => setData(d => ({ ...d, niveau: e.target.value }))}>
                  {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Durée</label>
              <select style={{ ...sel, maxWidth: 160 }} value={data.duree_semaines} onChange={e => setData(d => ({ ...d, duree_semaines: parseInt(e.target.value) }))}>
                {[2,3,4,6,8,10,12,16,20,24].map(n => <option key={n} value={n}>{n} semaines</option>)}
              </select>
            </div>
            {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
            <button onClick={() => { if (!data.nom.trim()) { setError("Nom obligatoire."); return; } setError(""); setStep(2); }}
              disabled={!data.nom.trim()}
              style={{ padding: "12px", borderRadius: 9, border: "none", backgroundColor: !data.nom.trim() ? "#1a1a1a" : "#B22222", color: !data.nom.trim() ? "#555" : "#fff", fontSize: 14, fontWeight: 700, cursor: !data.nom.trim() ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
              Suivant → Planifier les séances
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 */}
      {step === 2 && (
        <div>
          <ProgrammeBuilder data={data} onChange={setData} />
          {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>{error}</p>}
          <button onClick={handleSave} disabled={saving}
            style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
            {saving ? "Enregistrement…" : `✅ Sauvegarder le programme (${totalSeances} séance${totalSeances > 1 ? "s" : ""} planifiée${totalSeances > 1 ? "s" : ""})`}
          </button>
        </div>
      )}
    </div>
  );
}
