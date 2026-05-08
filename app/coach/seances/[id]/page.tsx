"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import SeanceBuilder, { FORMATS, newKey, type SeanceItem, type SeanceForm } from "../SeanceBuilder";

export default function SeanceDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [form, setForm] = useState<SeanceForm>({
    nom: "", type_format: "classique", duree_estimee: "20",
    description: "", tabata_work_default: "20", tabata_rest_default: "10",
    emom_total: "10", emom_interval_min: "1", emom_interval_sec: "0",
  });
  const [items, setItems] = useState<SeanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach/seances/${id}`);
    const data = await res.json();
    const s = data.seance;
    if (s) {
      setForm(f => ({
        ...f, nom: s.nom, type_format: s.type_format,
        duree_estimee: s.duree_estimee?.toString() ?? "20",
        description: s.description ?? "",
      }));
    }
    setItems((data.exercices ?? []).map((ex: Record<string,unknown>) => ({
      _key: newKey(),
      exercise_id: (ex.exercise as {id:string})?.id ?? ex.exercise_id,
      exercise: ex.exercise,
      series: (ex.series as number|null)?.toString() ?? "",
      repetitions: (ex.repetitions as number|null)?.toString() ?? "",
      duree_secondes: (ex.duree_secondes as number|null)?.toString() ?? "",
      temps_repos: (ex.temps_repos as number)?.toString() ?? "60",
      tabata_work: (ex.duree_secondes as number|null)?.toString() ?? "20",
      tabata_rest: (ex.temps_repos as number)?.toString() ?? "10",
      emom_duree: (ex.duree_secondes as number|null)?.toString() ?? "40",
      notes: (ex.notes as string|null) ?? "",
    })));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function updateForm(k: keyof SeanceForm, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setError(""); setSaving(true);
    const res = await fetch(`/api/coach/seances/${id}`, {
      method: "PUT",
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); }
    else router.push("/coach/seances");
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  if (loading) return <p style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>Chargement…</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push("/coach/seances")} style={{ background: "none", border: "1px solid #222", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>← Retour</button>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>✏️ Modifier — {form.nom}</h1>
      </div>

      {/* Infos générales */}
      <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #1a1a1a", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>Nom *</label><input style={inp} value={form.nom} onChange={e => updateForm("nom", e.target.value)} /></div>
          <div>
            <label style={lbl}>Format</label>
            <select style={{ ...inp, cursor: "pointer" }} value={form.type_format} onChange={e => updateForm("type_format", e.target.value)}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Durée (min)</label><input style={inp} type="number" min="1" value={form.duree_estimee} onChange={e => updateForm("duree_estimee", e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 12 }}><label style={lbl}>Description</label><textarea style={{ ...inp, height: 52, resize: "vertical" }} value={form.description} onChange={e => updateForm("description", e.target.value)} /></div>
      </div>

      {/* Builder */}
      <SeanceBuilder form={form} onFormChange={updateForm} items={items} onItemsChange={setItems} />

      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "12px 0 0", fontFamily: "system-ui" }}>{error}</p>}

      <button onClick={handleSave} disabled={saving} style={{ marginTop: 14, width: "100%", padding: "12px", borderRadius: 9, border: "none", backgroundColor: saving ? "#333" : "#B22222", color: saving ? "#666" : "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
        {saving ? "Enregistrement…" : "✅ Sauvegarder les modifications"}
      </button>
    </div>
  );
}
