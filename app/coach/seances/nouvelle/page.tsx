"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SeanceBuilder, { FORMATS, type SeanceItem, type SeanceForm } from "../SeanceBuilder";

const DEFAULT_FORM: SeanceForm = {
  nom: "", type_format: "classique", duree_estimee: "20",
  description: "", tabata_work_default: "20", tabata_rest_default: "10", emom_total: "10",
};

export default function NouvelleSeancePage() {
  const router = useRouter();
  const [step, setStep] = useState<1|2>(1);
  const [form, setForm] = useState<SeanceForm>({ ...DEFAULT_FORM });
  const [items, setItems] = useState<SeanceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateForm(k: keyof SeanceForm, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/coach/seances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: form.nom, type_format: form.type_format,
          duree_estimee: form.duree_estimee ? parseInt(form.duree_estimee) : null,
          description: form.description || null,
          exercices: items.map(ex => ({
            exercise_id: ex.exercise_id,
            series: ex.series ? parseInt(ex.series) : null,
            repetitions: ex.repetitions ? parseInt(ex.repetitions) : null,
            duree_secondes: (ex.duree_secondes || ex.emom_duree) ? parseInt(ex.duree_secondes || ex.emom_duree) : null,
            temps_repos: (ex.tabata_rest || ex.temps_repos) ? parseInt(ex.tabata_rest || ex.temps_repos) : 60,
            notes: ex.notes || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Erreur"); setSaving(false); return; }
      router.push("/coach/seances");
    } catch { setError("Impossible de contacter le serveur."); setSaving(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => step === 1 ? router.push("/coach/seances") : setStep(1)} style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>← Retour</button>
        <div>
          <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 1px", fontFamily: "system-ui" }}>Nouvelle séance</p>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
            {step === 1 ? "Informations" : form.nom}
          </h1>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
        {[{n:1,label:"Infos"},{n:2,label:"Exercices"}].map(({n,label},i) => (
          <div key={n} style={{ display:"flex",alignItems:"center" }}>
            {i > 0 && <div style={{ width: 40, height: 2, backgroundColor: step > 1 ? "#B22222" : "#222" }} />}
            <div style={{ display:"flex",alignItems:"center",gap:6,cursor:n<step?"pointer":"default" }} onClick={() => n<step && setStep(n as 1|2)}>
              <div style={{ width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:step>=n?"#B22222":"#1a1a1a",color:step>=n?"#fff":"#555",fontSize:11,fontWeight:700,fontFamily:"system-ui" }}>{n}</div>
              <span style={{ fontSize:12,fontWeight:step===n?700:400,color:step===n?"#F5F5F0":"#555",fontFamily:"system-ui" }}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Étape 1 ── */}
      {step === 1 && (
        <div style={{ backgroundColor: "#111", borderRadius: 14, border: "1px solid #1a1a1a", padding: "24px", maxWidth: 640 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={lbl}>Nom de la séance *</label><input style={inp} value={form.nom} onChange={e => updateForm("nom", e.target.value)} placeholder="Ex: Full Body Débutant" /></div>

            <div>
              <label style={lbl}>Type de format</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
                {FORMATS.map(f => (
                  <button key={f.value} type="button" onClick={() => updateForm("type_format", f.value)} style={{ padding: "10px 12px", borderRadius: 9, textAlign: "left", border: form.type_format===f.value ? "2px solid #B22222" : "1px solid #222", backgroundColor: form.type_format===f.value ? "rgba(178,34,34,0.1)" : "#161616", cursor: "pointer" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: form.type_format===f.value ? "#B22222" : "#F5F5F0", margin:"0 0 2px", fontFamily:"system-ui" }}>{f.label}</p>
                    <p style={{ fontSize: 10, color: "#555", margin: 0, fontFamily: "system-ui" }}>{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {(form.type_format === "classique" || form.type_format === "amrap" || form.type_format === "for_time") && (
              <div><label style={lbl}>Durée estimée (min)</label><input style={{ ...inp, maxWidth: 120 }} type="number" min="1" value={form.duree_estimee} onChange={e => updateForm("duree_estimee", e.target.value)} /></div>
            )}

            <div><label style={lbl}>Description</label><textarea style={{ ...inp, height: 72, resize: "vertical" }} value={form.description} onChange={e => updateForm("description", e.target.value)} placeholder="Objectif, niveau requis…" /></div>

            {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}

            <button onClick={() => { if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; } setError(""); setStep(2); }} disabled={!form.nom.trim()} style={{ padding: "12px", borderRadius: 9, border: "none", backgroundColor: !form.nom.trim() ? "#1a1a1a" : "#B22222", color: !form.nom.trim() ? "#555" : "#fff", fontSize: 14, fontWeight: 700, cursor: !form.nom.trim() ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
              Suivant → Ajouter les exercices
            </button>
          </div>
        </div>
      )}

      {/* ── Étape 2 ── */}
      {step === 2 && (
        <div>
          <SeanceBuilder form={form} onFormChange={updateForm} items={items} onItemsChange={setItems} />

          {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "12px 0 0", fontFamily: "system-ui" }}>{error}</p>}

          <button onClick={handleSave} disabled={saving} style={{ marginTop: 14, width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui", boxShadow: saving ? "none" : "0 2px 8px rgba(178,34,34,0.3)" }}>
            {saving ? "Enregistrement…" : `✅ Sauvegarder la séance (${items.length} exercice${items.length>1?"s":""})`}
          </button>
        </div>
      )}
    </div>
  );
}
