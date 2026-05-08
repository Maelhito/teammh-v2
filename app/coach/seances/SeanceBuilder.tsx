"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string;
  nom: string;
  groupe_musculaire: string;
  materiel: string;
  video_url: string | null;
  miniature_url: string | null;
}

export interface SeanceItem {
  _key: string;
  exercise_id: string;
  exercise: Exercise;
  // Classique
  series: string;
  repetitions: string;
  duree_secondes: string;
  temps_repos: string;
  // Tabata (par exercice)
  tabata_work: string;
  tabata_rest: string;
  // EMOM
  emom_duree: string;
  // Notes
  notes: string;
}

export interface SeanceForm {
  nom: string;
  type_format: string;
  duree_estimee: string;   // AMRAP / ForTime / total
  description: string;
  // Tabata global defaults
  tabata_work_default: string;
  tabata_rest_default: string;
  // EMOM
  emom_total: string;
  emom_interval_min: string;
  emom_interval_sec: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
export const FORMATS = [
  { value: "classique", label: "Classique",  desc: "Séries · Repos défini" },
  { value: "tabata",    label: "Tabata",     desc: "20s effort / 10s repos" },
  { value: "emom",      label: "EMOM",       desc: "Every Minute On the Minute" },
  { value: "amrap",     label: "AMRAP",      desc: "Chrono décompte" },
  { value: "for_time",  label: "For Time",   desc: "Chrono progression" },
];

const GROUPES = [
  "Quadriceps","Ischiojambier","Fessier","Abducteur","Adducteur",
  "Abdominaux","Biceps","Triceps","Pec","Dos","Lombaire","Épaule","Coeur",
];

const GROUPE_COLORS: Record<string,string> = {
  "Quadriceps":"#3B82F6","Ischiojambier":"#8B5CF6","Fessier":"#EC4899",
  "Abducteur":"#F59E0B","Adducteur":"#F97316","Abdominaux":"#EF4444",
  "Biceps":"#10B981","Triceps":"#06B6D4","Pec":"#F97316",
  "Dos":"#8B5CF6","Lombaire":"#84CC16","Épaule":"#B22222","Coeur":"#EF4444",
};

function ytThumb(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

let _kc = 0;
export function newKey() { return `sk_${++_kc}_${Date.now()}`; }

export function buildDefaultItem(ex: Exercise): SeanceItem {
  return {
    _key: newKey(), exercise_id: ex.id, exercise: ex,
    series: "", repetitions: "", duree_secondes: "", temps_repos: "60",
    tabata_work: "20", tabata_rest: "10", emom_duree: "40", notes: "",
  };
}

// ─── Chrono AMRAP (décompte) ──────────────────────────────────────────────────
function AmrapTimer({ totalMinutes }: { totalMinutes: number }) {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(totalMinutes * 60);
  const totalRef = useRef(totalMinutes * 60);

  useEffect(() => {
    totalRef.current = totalMinutes * 60;
    setRemaining(totalMinutes * 60);
    setRunning(false);
  }, [totalMinutes]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining]);

  const pct = ((totalRef.current - remaining) / totalRef.current) * 100;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: "16px 20px", border: "1px solid #2a2a2a" }}>
      <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", fontFamily: "system-ui" }}>AMRAP — Chrono décompte</p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <p style={{ fontSize: 36, fontWeight: 800, color: remaining <= 30 && running ? "#EF4444" : "#F5F5F0", margin: 0, fontFamily: "system-ui", minWidth: 90 }}>
          {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
        </p>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, backgroundColor: "#2a2a2a", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, backgroundColor: remaining <= 30 ? "#EF4444" : "#B22222", transition: "width 1s linear", borderRadius: 99 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRunning(r => !r)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", backgroundColor: running ? "#555" : "#B22222", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
            {running ? "⏸" : "▶"}
          </button>
          <button onClick={() => { setRunning(false); setRemaining(totalRef.current); }} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
    </div>
  );
}

// ─── Chrono ForTime (progression) ────────────────────────────────────────────
function ForTimeTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setElapsed(e => e + 1), 1000);
    return () => clearTimeout(t);
  }, [running, elapsed]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  return (
    <div style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: "16px 20px", border: "1px solid #2a2a2a" }}>
      <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", fontFamily: "system-ui" }}>FOR TIME — Chrono progression</p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <p style={{ fontSize: 36, fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui", minWidth: 90 }}>
          {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRunning(r => !r)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", backgroundColor: running ? "#555" : "#10B981", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
            {running ? "⏸" : "▶ Start"}
          </button>
          <button onClick={() => { setRunning(false); setElapsed(0); }} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
    </div>
  );
}

// ─── Chrono EMOM ─────────────────────────────────────────────────────────────
function EmomTimer({ totalMinutes, intervalSeconds }: { totalMinutes: number; intervalSeconds: number }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const interval = Math.max(intervalSeconds, 1);
  const total = totalMinutes * 60;
  const totalRounds = Math.floor(total / interval);

  useEffect(() => { setRunning(false); setElapsed(0); }, [totalMinutes, intervalSeconds]);

  useEffect(() => {
    if (!running || elapsed >= total) return;
    const t = setTimeout(() => setElapsed(e => e + 1), 1000);
    return () => clearTimeout(t);
  }, [running, elapsed, total]);

  const currentRound = Math.floor(elapsed / interval) + 1;
  const secInInterval = elapsed % interval;
  const remaining = interval - secInInterval;
  const remainingMin = Math.floor(remaining / 60);
  const remainingSec = remaining % 60;

  return (
    <div style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: "16px 20px", border: "1px solid #2a2a2a" }}>
      <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", fontFamily: "system-ui" }}>
        EMOM — Round {Math.min(currentRound, totalRounds)} / {totalRounds} · Intervalle {interval >= 60 ? `${Math.floor(interval/60)}min${interval%60>0?` ${interval%60}s`:""}` : `${interval}s`}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 11, color: "#444", margin: "0 0 2px", fontFamily: "system-ui" }}>Prochain round dans</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: remaining <= 10 ? "#EF4444" : "#60A5FA", margin: 0, fontFamily: "system-ui" }}>
            {remainingMin > 0 ? `${remainingMin}:${String(remainingSec).padStart(2,"0")}` : `:${String(remainingSec).padStart(2,"0")}`}
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, backgroundColor: "#2a2a2a", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${(elapsed/total)*100}%`, backgroundColor: "#3B82F6", transition: "width 1s linear", borderRadius: 99 }} />
          </div>
          <p style={{ fontSize: 10, color: "#444", margin: 0, fontFamily: "system-ui" }}>{Math.floor(elapsed/60)} / {totalMinutes} min écoulées</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRunning(r => !r)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", backgroundColor: running ? "#555" : "#3B82F6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
            {running ? "⏸" : "▶"}
          </button>
          <button onClick={() => { setRunning(false); setElapsed(0); }} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
    </div>
  );
}

// ─── Config format (affichée au-dessus de la liste) ───────────────────────────
function FormatConfig({ form, onChange }: { form: SeanceForm; onChange: (k: keyof SeanceForm, v: string) => void }) {
  const inp: React.CSSProperties = { padding: "7px 10px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 13, fontFamily: "system-ui", outline: "none", width: 80 };
  const lbl: React.CSSProperties = { fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "block", fontFamily: "system-ui" };

  if (form.type_format === "tabata") return (
    <div style={{ backgroundColor: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#F97316", margin: "0 0 10px", fontFamily: "system-ui" }}>🔥 Tabata — Defaults par exercice</p>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div><label style={lbl}>Temps effort (s)</label><input style={inp} type="number" value={form.tabata_work_default} onChange={e => onChange("tabata_work_default", e.target.value)} /></div>
        <div><label style={lbl}>Temps repos (s)</label><input style={inp} type="number" value={form.tabata_rest_default} onChange={e => onChange("tabata_rest_default", e.target.value)} /></div>
      </div>
    </div>
  );

  if (form.type_format === "emom") return (
    <div style={{ marginBottom: 14 }}>
      <EmomTimer
        totalMinutes={parseInt(form.emom_total) || 10}
        intervalSeconds={(parseInt(form.emom_interval_min) || 1) * 60 + (parseInt(form.emom_interval_sec) || 0)}
      />
      <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div><label style={lbl}>Durée totale (min)</label><input style={inp} type="number" min="1" value={form.emom_total} onChange={e => onChange("emom_total", e.target.value)} /></div>
        <div><label style={lbl}>Intervalle — min</label><input style={inp} type="number" min="0" value={form.emom_interval_min} onChange={e => onChange("emom_interval_min", e.target.value)} /></div>
        <div><label style={lbl}>Intervalle — sec</label><input style={inp} type="number" min="0" max="59" value={form.emom_interval_sec} onChange={e => onChange("emom_interval_sec", e.target.value)} /></div>
      </div>
    </div>
  );

  if (form.type_format === "amrap") return (
    <div style={{ marginBottom: 14 }}>
      <AmrapTimer totalMinutes={parseInt(form.duree_estimee) || 10} />
      <div style={{ marginTop: 10 }}>
        <label style={lbl}>Durée AMRAP (min)</label>
        <input style={inp} type="number" value={form.duree_estimee} onChange={e => onChange("duree_estimee", e.target.value)} />
      </div>
    </div>
  );

  if (form.type_format === "for_time") return (
    <div style={{ marginBottom: 14 }}>
      <ForTimeTimer />
    </div>
  );

  return null;
}

// ─── Ligne exercice dans la séance ───────────────────────────────────────────
function SessionRow({
  item, index, total, format, onChange, onRemove, onMoveUp, onMoveDown,
  onDragStart, onDragOver, onDrop, dragOver,
}: {
  item: SeanceItem; index: number; total: number; format: string;
  onChange: (key: string, field: string, val: string) => void;
  onRemove: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  dragOver: boolean;
}) {
  const thumb = item.exercise?.miniature_url || ytThumb(item.exercise?.video_url);
  const color = GROUPE_COLORS[item.exercise?.groupe_musculaire] ?? "#888";

  const inp: React.CSSProperties = { width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid #2a2a2a", fontSize: 11, fontFamily: "system-ui", outline: "none", backgroundColor: "#1a1a1a", color: "#F5F5F0", textAlign: "center" };

  const fields = (() => {
    if (format === "tabata") return [
      { key: "tabata_work", label: "Effort (s)", placeholder: "20" },
      { key: "tabata_rest", label: "Repos (s)", placeholder: "10" },
    ];
    if (format === "emom") return [
      { key: "emom_duree", label: "Durée (s)", placeholder: "40" },
    ];
    if (format === "amrap" || format === "for_time") return [];
    return [
      { key: "series",       label: "Séries",   placeholder: "—" },
      { key: "repetitions",  label: "Rép.",     placeholder: "—" },
      { key: "duree_secondes",label:"Durée (s)", placeholder: "—" },
      { key: "temps_repos",  label: "Repos (s)", placeholder: "60" },
    ];
  })();

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("source", "session"); e.dataTransfer.setData("sessionIndex", String(index)); onDragStart(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{
        backgroundColor: dragOver ? "#1a2a1a" : "#111",
        border: `1px solid ${dragOver ? "#4ADE80" : "#1e1e1e"}`,
        borderRadius: 10, marginBottom: 6, overflow: "hidden",
        transition: "border-color 0.1s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ cursor: "grab", color: "#333", fontSize: 16, userSelect: "none" }}>⠿</span>
        <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#B22222", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "system-ui" }}>{index+1}</span>
        <div style={{ width: 48, height: 34, borderRadius: 5, overflow: "hidden", backgroundColor: "#1a1a1a", flexShrink: 0 }}>
          {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏋️</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#F5F5F0", margin: "0 0 2px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.exercise?.nom}</p>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99, color, backgroundColor: `${color}20`, fontFamily: "system-ui" }}>{item.exercise?.groupe_musculaire}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <button onClick={() => onMoveUp(item._key)} disabled={index===0} style={{ background:"none",border:"none",cursor:index===0?"default":"pointer",color:index===0?"#2a2a2a":"#555",fontSize:9,padding:"1px 3px" }}>▲</button>
          <button onClick={() => onMoveDown(item._key)} disabled={index===total-1} style={{ background:"none",border:"none",cursor:index===total-1?"default":"pointer",color:index===total-1?"#2a2a2a":"#555",fontSize:9,padding:"1px 3px" }}>▼</button>
        </div>
        <button onClick={() => onRemove(item._key)} style={{ background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:14,padding:"2px 4px" }}>✕</button>
      </div>

      {(fields.length > 0 || true) && (
        <div style={{ padding: "8px 10px", display: "grid", gridTemplateColumns: `${fields.map(() => "1fr").join(" ")} 2fr`, gap: 6 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ display:"block",fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2,fontFamily:"system-ui" }}>{f.label}</label>
              <input style={inp} type="number" min="0" placeholder={f.placeholder} value={(item as unknown as Record<string,string>)[f.key] ?? ""} onChange={e => onChange(item._key, f.key, e.target.value)} />
            </div>
          ))}
          <div>
            <label style={{ display:"block",fontSize:8,color:"#555",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2,fontFamily:"system-ui" }}>Notes</label>
            <input style={{ ...inp, textAlign:"left" }} type="text" placeholder="Instructions…" value={item.notes} onChange={e => onChange(item._key, "notes", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panneau banque d'exercices ───────────────────────────────────────────────
function ExerciseBank({ onAdd, alreadyAdded }: { onAdd: (ex: Exercise) => void; alreadyAdded: string[] }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("tous");

  useEffect(() => {
    fetch("/api/coach/exercices").then(r => r.json()).then(d => setExercises(d.exercises ?? []));
  }, []);

  const filtered = exercises.filter(ex => {
    if (filterGroupe !== "tous" && ex.groupe_musculaire !== filterGroupe) return false;
    if (search && !ex.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a" }}>
      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "system-ui" }}>Banque d'exercices</p>
        <input type="search" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 12, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 11, fontFamily: "system-ui", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
          <option value="tous">Tous les groupes</option>
          {GROUPES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map(ex => {
          const added = alreadyAdded.includes(ex.id);
          const thumb = ex.miniature_url || ytThumb(ex.video_url);
          const color = GROUPE_COLORS[ex.groupe_musculaire] ?? "#888";
          return (
            <div
              key={ex.id}
              draggable={!added}
              onDragStart={e => {
                e.dataTransfer.setData("source", "bank");
                e.dataTransfer.setData("exerciseId", ex.id);
                e.dataTransfer.setData("exerciseData", JSON.stringify(ex));
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                borderBottom: "1px solid #111", cursor: added ? "default" : "grab",
                opacity: added ? 0.4 : 1, backgroundColor: "#0D0D0D",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (!added) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#111"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D0D"; }}
            >
              <div style={{ width: 44, height: 32, borderRadius: 5, overflow: "hidden", backgroundColor: "#1a1a1a", flexShrink: 0 }}>
                {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏋️</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#F5F5F0", margin: "0 0 2px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.nom}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99, color, backgroundColor: `${color}20`, fontFamily: "system-ui" }}>{ex.groupe_musculaire}</span>
              </div>
              <button
                disabled={added}
                onClick={() => !added && onAdd(ex)}
                style={{ flexShrink: 0, background: "none", border: "none", color: added ? "#333" : "#B22222", cursor: added ? "default" : "pointer", fontSize: 18, padding: "0 2px" }}
                title={added ? "Déjà ajouté" : "Ajouter"}
              >+</button>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "8px 12px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 9, color: "#333", margin: 0, fontFamily: "system-ui" }}>⠿ Glisse dans la séance ou clique +</p>
      </div>
    </div>
  );
}

// ─── Drop zone indicateur ─────────────────────────────────────────────────────
// ─── Builder principal ────────────────────────────────────────────────────────
export interface SeanceBuilderProps {
  form: SeanceForm;
  onFormChange: (k: keyof SeanceForm, v: string) => void;
  items: SeanceItem[];
  onItemsChange: (items: SeanceItem[]) => void;
}

export default function SeanceBuilder({ form, onFormChange, items, onItemsChange }: SeanceBuilderProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropZoneOver, setDropZoneOver] = useState(false);
  const sessionDragIndex = useRef<number | null>(null);

  const addExercise = useCallback((ex: Exercise) => {
    onItemsChange([...items, { ...buildDefaultItem(ex), tabata_work: form.tabata_work_default || "20", tabata_rest: form.tabata_rest_default || "10" }]);
  }, [items, onItemsChange, form.tabata_work_default, form.tabata_rest_default]);

  function changeField(key: string, field: string, val: string) {
    onItemsChange(items.map(i => i._key === key ? { ...i, [field]: val } : i));
  }
  function removeItem(key: string) { onItemsChange(items.filter(i => i._key !== key)); }
  function moveUp(key: string) {
    const idx = items.findIndex(i => i._key === key);
    if (idx <= 0) return;
    const next = [...items]; [next[idx-1], next[idx]] = [next[idx], next[idx-1]]; onItemsChange(next);
  }
  function moveDown(key: string) {
    const idx = items.findIndex(i => i._key === key);
    if (idx >= items.length - 1) return;
    const next = [...items]; [next[idx], next[idx+1]] = [next[idx+1], next[idx]]; onItemsChange(next);
  }

  function handleDropOnZone(e: React.DragEvent) {
    e.preventDefault();
    setDropZoneOver(false);
    const source = e.dataTransfer.getData("source");
    if (source === "bank") {
      try { const ex = JSON.parse(e.dataTransfer.getData("exerciseData")); addExercise(ex); } catch {}
    }
  }


  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, minHeight: 520, border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
      {/* ← Banque */}
      <ExerciseBank onAdd={addExercise} alreadyAdded={items.map(i => i.exercise_id)} />

      {/* → Séance */}
      <div style={{ backgroundColor: "#111", display: "flex", flexDirection: "column", padding: "14px", overflowY: "auto" }}>
        {/* Config format */}
        <FormatConfig form={form} onChange={onFormChange} />

        {/* Drop zone si vide */}
        {items.length === 0 ? (
          <div
            onDragOver={e => { e.preventDefault(); setDropZoneOver(true); }}
            onDragLeave={() => setDropZoneOver(false)}
            onDrop={handleDropOnZone}
            style={{
              flex: 1, border: `2px dashed ${dropZoneOver ? "#B22222" : "#2a2a2a"}`,
              borderRadius: 10, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
              backgroundColor: dropZoneOver ? "rgba(178,34,34,0.05)" : "transparent",
              transition: "all 0.15s", minHeight: 200,
            }}
          >
            <span style={{ fontSize: 28 }}>🏋️</span>
            <p style={{ fontSize: 12, color: dropZoneOver ? "#B22222" : "#444", margin: 0, fontFamily: "system-ui", fontWeight: dropZoneOver ? 700 : 400 }}>
              {dropZoneOver ? "Lâche ici !" : "Glisse des exercices ici ou clique +"}
            </p>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDropZoneOver(true); }}
            onDragLeave={() => setDropZoneOver(false)}
            onDrop={handleDropOnZone}
          >
            <p style={{ fontSize: 9, color: "#333", margin: "0 0 8px", fontFamily: "system-ui" }}>⠿ Glisse pour réordonner · ▲▼ pour déplacer</p>
            {items.map((item, idx) => (
              <SessionRow
                key={item._key} item={item} index={idx} total={items.length} format={form.type_format}
                onChange={changeField} onRemove={removeItem} onMoveUp={moveUp} onMoveDown={moveDown}
                onDragStart={() => { sessionDragIndex.current = idx; }}
                onDragOver={() => setDragOverIndex(idx)}
                onDrop={() => {
                  const from = sessionDragIndex.current;
                  if (from !== null && from !== idx) {
                    const next = [...items];
                    const [it] = next.splice(from, 1);
                    next.splice(idx, 0, it);
                    sessionDragIndex.current = null;
                    onItemsChange(next);
                  }
                  setDragOverIndex(null);
                }}
                dragOver={dragOverIndex === idx}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui" }}>{items.length} exercice{items.length > 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
