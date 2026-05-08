"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

interface Exercise {
  id: string;
  nom: string;
  groupe_musculaire: string;
  materiel: string;
  video_url: string | null;
  miniature_url: string | null;
}

interface SeanceExercice {
  _key: string;
  id?: string;
  exercise_id: string;
  exercise: Exercise;
  series: string;
  repetitions: string;
  duree_secondes: string;
  temps_repos: string;
  notes: string;
}

const FORMATS = [
  { value: "classique", label: "Classique",  desc: "Séries classiques" },
  { value: "tabata",    label: "Tabata",     desc: "20s / 10s" },
  { value: "emom",      label: "EMOM",       desc: "Every Minute On the Minute" },
  { value: "amrap",     label: "AMRAP",      desc: "As Many Rounds As Possible" },
  { value: "for_time",  label: "For Time",   desc: "Le plus vite possible" },
];

const GROUPE_COLORS: Record<string, string> = {
  "Quadriceps": "#3B82F6", "Ischiojambier": "#8B5CF6", "Fessier": "#EC4899",
  "Abducteur": "#F59E0B", "Adducteur": "#F97316", "Abdominaux": "#EF4444",
  "Biceps": "#10B981", "Triceps": "#06B6D4", "Pec": "#F97316",
  "Dos": "#8B5CF6", "Lombaire": "#84CC16", "Épaule": "#B22222", "Coeur": "#EF4444",
};

function ytThumb(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

let kc = 0;
function nk() { return `ek_${++kc}`; }

function ExercisePicker({ onSelect, onClose, alreadySelected }: { onSelect: (ex: Exercise) => void; onClose: () => void; alreadySelected: string[] }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => { fetch("/api/coach/exercices").then(r => r.json()).then(d => setExercises(d.exercises ?? [])); }, []);
  const filtered = exercises.filter(ex => !search || ex.nom.toLowerCase().includes(search.toLowerCase()));
  const color = (g: string) => GROUPE_COLORS[g] ?? "#888";
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, width: "min(540px,95vw)", maxHeight: "80vh", backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 10, alignItems: "center" }}>
          <input autoFocus type="search" placeholder="🔍  Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: "7px 11px", borderRadius: 7, border: "1px solid #e8e8e8", fontSize: 13, fontFamily: "system-ui", outline: "none" }} />
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map(ex => {
            const sel = alreadySelected.includes(ex.id);
            const thumb = ex.miniature_url || ytThumb(ex.video_url);
            return (
              <div key={ex.id} onClick={() => !sel && onSelect(ex)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", borderBottom: "1px solid #f8f8f8", cursor: sel ? "default" : "pointer", opacity: sel ? 0.5 : 1, backgroundColor: "#fff" }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f5f5f5"; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fff"; }}>
                <div style={{ width: 52, height: 38, borderRadius: 6, overflow: "hidden", backgroundColor: "#f0f0f0", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏋️</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: "0 0 2px", fontFamily: "system-ui" }}>{ex.nom}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, color: color(ex.groupe_musculaire), backgroundColor: `${color(ex.groupe_musculaire)}15`, fontFamily: "system-ui" }}>{ex.groupe_musculaire}</span>
                </div>
                {sel ? <span style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui" }}>Déjà ajouté</span> : <span style={{ fontSize: 18, color: "#B22222" }}>+</span>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function SeanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [nom, setNom] = useState("");
  const [typeFormat, setTypeFormat] = useState("classique");
  const [dureeEstimee, setDureeEstimee] = useState("");
  const [description, setDescription] = useState("");
  const [exercices, setExercices] = useState<SeanceExercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/coach/seances/${id}`);
    const data = await res.json();
    const s = data.seance;
    if (s) { setNom(s.nom); setTypeFormat(s.type_format); setDureeEstimee(s.duree_estimee?.toString() ?? ""); setDescription(s.description ?? ""); }
    setExercices((data.exercices ?? []).map((ex: Record<string, unknown>) => ({
      _key: nk(), id: ex.id as string, exercise_id: (ex as { exercise: { id: string } }).exercise?.id ?? ex.exercise_id,
      exercise: (ex as { exercise: Exercise }).exercise,
      series: (ex as { series: number | null }).series?.toString() ?? "", repetitions: (ex as { repetitions: number | null }).repetitions?.toString() ?? "",
      duree_secondes: (ex as { duree_secondes: number | null }).duree_secondes?.toString() ?? "", temps_repos: (ex as { temps_repos: number }).temps_repos?.toString() ?? "60", notes: (ex as { notes: string | null }).notes ?? "",
    })));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function addExercise(ex: Exercise) { setExercices(p => [...p, { _key: nk(), exercise_id: ex.id, exercise: ex, series: "", repetitions: "", duree_secondes: "", temps_repos: "60", notes: "" }]); setPickerOpen(false); }
  function removeExercise(key: string) { setExercices(p => p.filter(e => e._key !== key)); }
  function changeField(key: string, field: string, val: string) { setExercices(p => p.map(e => e._key === key ? { ...e, [field]: val } : e)); }
  function moveUp(key: string) { setExercices(p => { const i = p.findIndex(e => e._key === key); if (i <= 0) return p; const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); }
  function moveDown(key: string) { setExercices(p => { const i = p.findIndex(e => e._key === key); if (i >= p.length - 1) return p; const n = [...p]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); }

  async function handleSave() {
    setError(""); setSaving(true);
    const res = await fetch(`/api/coach/seances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom, type_format: typeFormat,
        duree_estimee: dureeEstimee ? parseInt(dureeEstimee) : null,
        description: description || null,
        exercices: exercices.map(ex => ({ exercise_id: ex.exercise_id, series: ex.series ? parseInt(ex.series) : null, repetitions: ex.repetitions ? parseInt(ex.repetitions) : null, duree_secondes: ex.duree_secondes ? parseInt(ex.duree_secondes) : null, temps_repos: ex.temps_repos ? parseInt(ex.temps_repos) : 60, notes: ex.notes || null })),
      }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur"); }
    else router.push("/coach/seances");
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #e0e0e0", backgroundColor: "#fafafa", fontSize: 13, color: "#1a1a1a", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };
  const rowInp: React.CSSProperties = { width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid #e8e8e8", fontSize: 12, fontFamily: "system-ui", outline: "none", backgroundColor: "#fafafa", textAlign: "center" };

  if (loading) return <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Chargement…</p>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push("/coach/seances")} style={{ background: "none", border: "1px solid #e8e8e8", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui" }}>← Retour</button>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>✏️ Modifier la séance</h1>
      </div>

      {/* Infos générales */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef", padding: "20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={lbl}>Nom *</label><input style={inp} value={nom} onChange={e => setNom(e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Format</label>
            <select style={{ ...inp, cursor: "pointer" }} value={typeFormat} onChange={e => setTypeFormat(e.target.value)}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Durée (min)</label><input style={inp} type="number" min="1" value={dureeEstimee} onChange={e => setDureeEstimee(e.target.value)} /></div>
        </div>
        <div><label style={lbl}>Description</label><textarea style={{ ...inp, height: 60, resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} /></div>
      </div>

      {/* Exercices */}
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef", padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>{exercices.length} exercice{exercices.length > 1 ? "s" : ""}</p>
          <button onClick={() => setPickerOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 7, border: "1px solid rgba(178,34,34,0.3)", backgroundColor: "rgba(178,34,34,0.05)", color: "#B22222", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>➕ Ajouter</button>
        </div>
        {exercices.map((item, idx) => {
          const thumb = item.exercise?.miniature_url || ytThumb(item.exercise?.video_url);
          const color = GROUPE_COLORS[item.exercise?.groupe_musculaire] ?? "#888";
          return (
            <div key={item._key} draggable onDragStart={() => { dragIndex.current = idx; }} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIndex.current !== null && dragIndex.current !== idx) { setExercices(p => { const n = [...p]; const [it] = n.splice(dragIndex.current!, 1); n.splice(idx, 0, it); dragIndex.current = null; return n; }); } }} style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid #f5f5f5" }}>
                <span style={{ cursor: "grab", color: "#ccc", fontSize: 16, userSelect: "none" }}>⠿</span>
                <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#B22222", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "system-ui" }}>{idx + 1}</span>
                <div style={{ width: 52, height: 38, borderRadius: 6, overflow: "hidden", backgroundColor: "#f0f0f0", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏋️</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.exercise?.nom}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, color, backgroundColor: `${color}15`, fontFamily: "system-ui" }}>{item.exercise?.groupe_musculaire}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <button onClick={() => moveUp(item._key)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "#ddd" : "#888", fontSize: 10, padding: "1px 3px" }}>▲</button>
                  <button onClick={() => moveDown(item._key)} disabled={idx === exercices.length - 1} style={{ background: "none", border: "none", cursor: idx === exercices.length - 1 ? "default" : "pointer", color: idx === exercices.length - 1 ? "#ddd" : "#888", fontSize: 10, padding: "1px 3px" }}>▼</button>
                </div>
                <button onClick={() => removeExercise(item._key)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 15, padding: "2px 4px" }}>✕</button>
              </div>
              <div style={{ padding: "8px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr", gap: 6 }}>
                {[["series","Séries"],["repetitions","Rép."],["duree_secondes","Durée (s)"],["temps_repos","Repos (s)"]].map(([field, label]) => (
                  <div key={field}>
                    <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2, fontFamily: "system-ui" }}>{label}</label>
                    <input style={rowInp} type="number" min="0" placeholder="—" value={(item as unknown as Record<string, string>)[field]} onChange={e => changeField(item._key, field, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2, fontFamily: "system-ui" }}>Notes</label>
                  <input style={{ ...rowInp, textAlign: "left" }} type="text" placeholder="Instructions…" value={item.notes} onChange={e => changeField(item._key, "notes", e.target.value)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "0 0 12px", fontFamily: "system-ui" }}>{error}</p>}

      <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "12px", borderRadius: 9, border: "none", backgroundColor: saving ? "#ccc" : "#B22222", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
        {saving ? "Enregistrement…" : "✅ Sauvegarder les modifications"}
      </button>

      {pickerOpen && <ExercisePicker onSelect={addExercise} onClose={() => setPickerOpen(false)} alreadySelected={exercices.map(e => e.exercise_id)} />}
    </div>
  );
}
