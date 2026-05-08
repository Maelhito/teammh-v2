"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  exercise_id: string;
  exercise: Exercise;
  series: string;
  repetitions: string;
  duree_secondes: string;
  temps_repos: string;
  notes: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const FORMATS = [
  { value: "classique", label: "Classique",  desc: "Séries classiques, temps de repos définis" },
  { value: "tabata",    label: "Tabata",     desc: "20s effort / 10s repos, 8 rounds" },
  { value: "emom",      label: "EMOM",       desc: "Every Minute On the Minute" },
  { value: "amrap",     label: "AMRAP",      desc: "As Many Rounds As Possible" },
  { value: "for_time",  label: "For Time",   desc: "Terminer le plus vite possible" },
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

let keyCounter = 0;
function newKey() { return `ex_${++keyCounter}_${Date.now()}`; }

// ─── Composant : sélecteur d'exercices ───────────────────────────────────────
function ExercisePicker({
  onSelect, onClose, alreadySelected,
}: { onSelect: (ex: Exercise) => void; onClose: () => void; alreadySelected: string[] }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/coach/exercices")
      .then(r => r.json())
      .then(d => setExercises(d.exercises ?? []));
  }, []);

  const filtered = exercises.filter(ex =>
    (!search || ex.nom.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 101, width: "min(560px, 95vw)", maxHeight: "80vh",
        backgroundColor: "#fff", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12 }}>
          <input
            autoFocus
            type="search"
            placeholder="🔍  Rechercher un exercice…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8e8",
              fontSize: 13, fontFamily: "system-ui", outline: "none", backgroundColor: "#fafafa",
            }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: "24px", textAlign: "center", color: "#bbb", fontSize: 13, fontFamily: "system-ui" }}>Aucun exercice trouvé</p>
          ) : filtered.map(ex => {
            const selected = alreadySelected.includes(ex.id);
            const thumb = ex.miniature_url || ytThumb(ex.video_url);
            const color = GROUPE_COLORS[ex.groupe_musculaire] ?? "#888";
            return (
              <div
                key={ex.id}
                onClick={() => !selected && onSelect(ex)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                  borderBottom: "1px solid #f8f8f8",
                  backgroundColor: selected ? "#fafafa" : "#fff",
                  cursor: selected ? "default" : "pointer",
                  opacity: selected ? 0.5 : 1,
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f5f5f5"; }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fff"; }}
              >
                <div style={{ width: 56, height: 40, borderRadius: 6, overflow: "hidden", backgroundColor: "#f0f0f0", flexShrink: 0 }}>
                  {thumb
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={thumb} alt={ex.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏋️</div>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: "0 0 3px", fontFamily: "system-ui" }}>{ex.nom}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, color, backgroundColor: `${color}15`, fontFamily: "system-ui" }}>
                    {ex.groupe_musculaire}
                  </span>
                </div>
                {selected
                  ? <span style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui" }}>Déjà ajouté</span>
                  : <span style={{ fontSize: 18, color: "#B22222" }}>+</span>
                }
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Ligne exercice dans le builder ──────────────────────────────────────────
function ExerciceRow({
  item, index, total, onChange, onRemove, onMoveUp, onMoveDown, isDragging, onDragStart, onDragOver, onDrop,
}: {
  item: SeanceExercice; index: number; total: number;
  onChange: (key: string, field: string, val: string) => void;
  onRemove: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const thumb = item.exercise.miniature_url || ytThumb(item.exercise.video_url);
  const color = GROUPE_COLORS[item.exercise.groupe_musculaire] ?? "#888";
  const inp: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e8e8e8",
    fontSize: 12, fontFamily: "system-ui", outline: "none", backgroundColor: "#fafafa",
    textAlign: "center",
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(e); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        backgroundColor: isDragging ? "#f0f7ff" : "#fff",
        border: `1px solid ${isDragging ? "#B22222" : "#efefef"}`,
        borderRadius: 10, marginBottom: 8, overflow: "hidden",
        transition: "border-color 0.15s",
        opacity: isDragging ? 0.7 : 1,
      }}
    >
      {/* Header ligne */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid #f5f5f5" }}>
        {/* Drag handle */}
        <span style={{ cursor: "grab", color: "#ccc", fontSize: 16, flexShrink: 0, userSelect: "none" }}>⠿</span>

        {/* Numéro */}
        <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#B22222", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "system-ui" }}>
          {index + 1}
        </span>

        {/* Miniature */}
        <div style={{ width: 56, height: 40, borderRadius: 6, overflow: "hidden", backgroundColor: "#f0f0f0", flexShrink: 0 }}>
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt={item.exercise.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏋️</div>
          }
        </div>

        {/* Nom + groupe */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 3px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.exercise.nom}
          </p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, color, backgroundColor: `${color}15`, fontFamily: "system-ui" }}>
            {item.exercise.groupe_musculaire}
          </span>
        </div>

        {/* Flèches ordre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button onClick={() => onMoveUp(item._key)} disabled={index === 0} style={{ background: "none", border: "none", cursor: index === 0 ? "default" : "pointer", color: index === 0 ? "#ddd" : "#888", fontSize: 11, padding: "1px 4px" }}>▲</button>
          <button onClick={() => onMoveDown(item._key)} disabled={index === total - 1} style={{ background: "none", border: "none", cursor: index === total - 1 ? "default" : "pointer", color: index === total - 1 ? "#ddd" : "#888", fontSize: 11, padding: "1px 4px" }}>▼</button>
        </div>

        {/* Supprimer */}
        <button onClick={() => onRemove(item._key)} style={{
          background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 16, padding: "2px 4px",
        }}>✕</button>
      </div>

      {/* Champs */}
      <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr", gap: 8 }}>
        <div>
          <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, fontFamily: "system-ui" }}>Séries</label>
          <input style={inp} type="number" min="1" placeholder="—" value={item.series} onChange={e => onChange(item._key, "series", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, fontFamily: "system-ui" }}>Rép.</label>
          <input style={inp} type="number" min="1" placeholder="—" value={item.repetitions} onChange={e => onChange(item._key, "repetitions", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, fontFamily: "system-ui" }}>Durée (s)</label>
          <input style={inp} type="number" min="1" placeholder="—" value={item.duree_secondes} onChange={e => onChange(item._key, "duree_secondes", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, fontFamily: "system-ui" }}>Repos (s)</label>
          <input style={inp} type="number" min="0" placeholder="60" value={item.temps_repos} onChange={e => onChange(item._key, "temps_repos", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3, fontFamily: "system-ui" }}>Notes</label>
          <input style={{ ...inp, textAlign: "left" }} type="text" placeholder="Ex: Contrôle excentrique…" value={item.notes} onChange={e => onChange(item._key, "notes", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function NouvelleSeancePage() {
  const router = useRouter();

  // Étape
  const [step, setStep] = useState<1 | 2>(1);

  // Étape 1
  const [nom, setNom] = useState("");
  const [typeFormat, setTypeFormat] = useState("classique");
  const [dureeEstimee, setDureeEstimee] = useState("");
  const [description, setDescription] = useState("");

  // Étape 2
  const [exercices, setExercices] = useState<SeanceExercice[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragIndex = useRef<number | null>(null);

  // Sauvegarde
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addExercise(ex: Exercise) {
    setExercices(prev => [...prev, {
      _key: newKey(), exercise_id: ex.id, exercise: ex,
      series: "", repetitions: "", duree_secondes: "", temps_repos: "60", notes: "",
    }]);
    setPickerOpen(false);
  }

  function removeExercise(key: string) {
    setExercices(prev => prev.filter(e => e._key !== key));
  }

  function changeField(key: string, field: string, val: string) {
    setExercices(prev => prev.map(e => e._key === key ? { ...e, [field]: val } : e));
  }

  function moveUp(key: string) {
    setExercices(prev => {
      const idx = prev.findIndex(e => e._key === key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(key: string) {
    setExercices(prev => {
      const idx = prev.findIndex(e => e._key === key);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function handleDragStart(idx: number) { dragIndex.current = idx; }
  function handleDrop(dropIdx: number) {
    if (dragIndex.current === null || dragIndex.current === dropIdx) return;
    setExercices(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIndex.current!, 1);
      next.splice(dropIdx, 0, item);
      dragIndex.current = null;
      return next;
    });
  }

  async function handleSave() {
    setError(""); setSaving(true);
    try {
      const payload = {
        nom, type_format: typeFormat,
        duree_estimee: dureeEstimee ? parseInt(dureeEstimee) : null,
        description: description || null,
        exercices: exercices.map(ex => ({
          exercise_id: ex.exercise_id,
          series: ex.series ? parseInt(ex.series) : null,
          repetitions: ex.repetitions ? parseInt(ex.repetitions) : null,
          duree_secondes: ex.duree_secondes ? parseInt(ex.duree_secondes) : null,
          temps_repos: ex.temps_repos ? parseInt(ex.temps_repos) : 60,
          notes: ex.notes || null,
        })),
      };
      const res = await fetch("/api/coach/seances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Erreur"); setSaving(false); return; }
      router.push("/coach/seances");
    } catch { setError("Impossible de contacter le serveur."); }
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e0e0e0",
    backgroundColor: "#fafafa", fontSize: 13, color: "#1a1a1a",
    fontFamily: "system-ui", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#888",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui",
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => step === 1 ? router.push("/coach/seances") : setStep(1)} style={{
          background: "none", border: "1px solid #e8e8e8", borderRadius: 7,
          padding: "6px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "system-ui",
        }}>← Retour</button>
        <div>
          <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 1px", fontFamily: "system-ui" }}>
            Nouvelle séance
          </p>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {step === 1 ? "Informations générales" : `Exercices — ${nom}`}
          </h1>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
        {[
          { n: 1, label: "Infos" },
          { n: 2, label: "Exercices" },
        ].map(({ n, label }, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div style={{ width: 40, height: 2, backgroundColor: step > i ? "#B22222" : "#e8e8e8" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: n < step ? "pointer" : "default" }} onClick={() => { if (n < step) setStep(n as 1 | 2); }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: step >= n ? "#B22222" : "#f0f0f0",
                color: step >= n ? "#fff" : "#aaa",
                fontSize: 12, fontWeight: 700, fontFamily: "system-ui",
              }}>{n}</div>
              <span style={{ fontSize: 12, fontWeight: step === n ? 700 : 400, color: step === n ? "#1a1a1a" : "#aaa", fontFamily: "system-ui" }}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Étape 1 ─────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div>
              <label style={lbl}>Nom de la séance *</label>
              <input style={inp} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Full Body Débutant" />
            </div>

            <div>
              <label style={lbl}>Type de format</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {FORMATS.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setTypeFormat(f.value)}
                    style={{
                      padding: "10px 12px", borderRadius: 9, textAlign: "left",
                      border: typeFormat === f.value ? "2px solid #B22222" : "1px solid #e8e8e8",
                      backgroundColor: typeFormat === f.value ? "rgba(178,34,34,0.05)" : "#fafafa",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: typeFormat === f.value ? "#B22222" : "#1a1a1a", margin: "0 0 3px", fontFamily: "system-ui" }}>{f.label}</p>
                    <p style={{ fontSize: 10, color: "#aaa", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={lbl}>Durée estimée (minutes)</label>
              <input style={{ ...inp, maxWidth: 140 }} type="number" min="1" placeholder="45" value={dureeEstimee} onChange={e => setDureeEstimee(e.target.value)} />
            </div>

            <div>
              <label style={lbl}>Description</label>
              <textarea style={{ ...inp, height: 80, resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectif, niveau requis, conseils…" />
            </div>

            <button
              onClick={() => { if (!nom.trim()) { setError("Le nom est obligatoire."); return; } setError(""); setStep(2); }}
              disabled={!nom.trim()}
              style={{
                padding: "12px", borderRadius: 9, border: "none",
                backgroundColor: !nom.trim() ? "#e0e0e0" : "#B22222",
                color: !nom.trim() ? "#aaa" : "#fff",
                fontSize: 14, fontWeight: 700, cursor: !nom.trim() ? "not-allowed" : "pointer", fontFamily: "system-ui",
              }}
            >
              Suivant → Ajouter les exercices
            </button>
            {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
          </div>
        </div>
      )}

      {/* ── Étape 2 ─────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          {/* Exercices */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef", padding: "20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
                {exercices.length} exercice{exercices.length > 1 ? "s" : ""} dans la séance
              </p>
              <button
                onClick={() => setPickerOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(178,34,34,0.3)",
                  backgroundColor: "rgba(178,34,34,0.05)", color: "#B22222",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
                }}
              >
                ➕ Ajouter un exercice
              </button>
            </div>

            {exercices.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", border: "1px dashed #e8e8e8", borderRadius: 10 }}>
                <p style={{ fontSize: 24, margin: "0 0 8px" }}>🏋️</p>
                <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 12px", fontFamily: "system-ui" }}>
                  Aucun exercice ajouté — clique sur "Ajouter" pour commencer
                </p>
                <button onClick={() => setPickerOpen(true)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  backgroundColor: "#B22222", color: "#fff", fontSize: 12,
                  fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
                }}>➕ Ajouter un exercice</button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 10, color: "#ccc", margin: "0 0 10px", fontFamily: "system-ui" }}>
                  ⠿ Glisse les lignes pour réordonner · ▲▼ pour déplacer
                </p>
                {exercices.map((item, idx) => (
                  <ExerciceRow
                    key={item._key} item={item} index={idx} total={exercices.length}
                    onChange={changeField} onRemove={removeExercise}
                    onMoveUp={moveUp} onMoveDown={moveDown}
                    isDragging={dragIndex.current === idx}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={() => {}}
                    onDrop={() => handleDrop(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Erreur */}
          {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "0 0 12px", fontFamily: "system-ui" }}>{error}</p>}

          {/* Bouton sauvegarder */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none",
              backgroundColor: saving ? "#ccc" : "#B22222", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "system-ui", boxShadow: saving ? "none" : "0 2px 8px rgba(178,34,34,0.25)",
            }}
          >
            {saving ? "Enregistrement…" : `✅ Sauvegarder la séance (${exercices.length} exercice${exercices.length > 1 ? "s" : ""})`}
          </button>
        </div>
      )}

      {/* Picker exercices */}
      {pickerOpen && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setPickerOpen(false)}
          alreadySelected={exercices.map(e => e.exercise_id)}
        />
      )}
    </div>
  );
}
