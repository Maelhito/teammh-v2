"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string; nom: string; groupe_musculaire: string; materiel: string;
  video_url: string | null; miniature_url: string | null;
}
export interface TabataItem {
  _key: string; exercise_id: string; exercise: Exercise;
  series: string; tabata_work: string; tabata_rest: string; notes: string;
}
export interface RichExercise { _key: string; exercise: Exercise; }
export type BlocType = "echauffement" | "corps" | "finisher";
export interface Bloc {
  _key: string; type: BlocType; nom: string; format: string;
  instructions: string;
  type_score: string;
  note_bloc: string;
  tabata_work: string; tabata_rest: string; tabata_tours: string;
  tabata_exercices: TabataItem[];
  emom_rounds: string; emom_interval_min: string; emom_interval_sec: string;
  amrap_duree: string; for_time_limit: string;
  rich_exercices: RichExercise[];
}
export interface SeanceData {
  nom: string; categorie: string; niveau: string; duree_estimee: string; note: string;
  blocs: Bloc[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
export const FORMATS = [
  { value: "classique", label: "Classique" },
  { value: "tabata",    label: "Tabata" },
  { value: "emom",      label: "EMOM" },
  { value: "amrap",     label: "AMRAP" },
  { value: "for_time",  label: "For Time" },
];
export const CATEGORIES = [
  { value: "full_body",     label: "Full Body" },
  { value: "bas_du_corps",  label: "Bas du corps" },
  { value: "haut_du_corps", label: "Haut du corps" },
  { value: "stretching",    label: "Stretching" },
];
export const NIVEAUX = [
  { value: "debutant",      label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance",        label: "Avancé" },
];
const TYPE_SCORES = [
  { value: "",           label: "Ajouter un type de score" },
  { value: "reps",       label: "Reps" },
  { value: "charge",     label: "Charge (kg)" },
  { value: "temps",      label: "Temps" },
  { value: "rounds_reps",label: "Rounds + Reps" },
  { value: "distance",   label: "Distance (m)" },
  { value: "calories",   label: "Calories" },
];
const GROUPES = [
  "Quadriceps","Ischiojambier","Fessier","Abducteur","Adducteur",
  "Abdominaux","Biceps","Triceps","Pec","Dos","Lombaire","Épaule","Coeur",
];
const GC: Record<string, string> = {
  "Quadriceps":"#3B82F6","Ischiojambier":"#8B5CF6","Fessier":"#EC4899",
  "Abducteur":"#F59E0B","Adducteur":"#F97316","Abdominaux":"#EF4444",
  "Biceps":"#10B981","Triceps":"#06B6D4","Pec":"#F97316",
  "Dos":"#8B5CF6","Lombaire":"#84CC16","Épaule":"#B22222","Coeur":"#EF4444",
};
const BCOLORS: Record<BlocType, string> = {
  echauffement: "#F97316",
  corps:        "#B22222",
  finisher:     "#8B5CF6",
};
const BLOC_LABELS: Record<BlocType, string> = {
  echauffement: "WARM UP",
  corps:        "WOD",
  finisher:     "COOL DOWN",
};

let _k = 0;
export function newKey() { return `k${++_k}_${Date.now()}`; }

function ytThumb(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}
function ytEmbed(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : null;
}

export function defaultBloc(type: BlocType, i = 1): Bloc {
  return {
    _key: newKey(), type,
    nom: type === "echauffement" ? "Échauffement" : type === "finisher" ? "Finisher" : `Bloc ${i}`,
    format: "classique", instructions: "",
    type_score: "", note_bloc: "",
    tabata_work: "20", tabata_rest: "10", tabata_tours: "8", tabata_exercices: [],
    emom_rounds: "10", emom_interval_min: "1", emom_interval_sec: "0",
    amrap_duree: "10", for_time_limit: "20",
    rich_exercices: [],
  };
}

// ─── Encode / Decode ──────────────────────────────────────────────────────────
export function encodeSeance(d: SeanceData): { description: string; flat_exercices: object[] } {
  const description = JSON.stringify({
    categorie: d.categorie, niveau: d.niveau,
    blocs: d.blocs.map(b => ({
      key: b._key, type: b.type, nom: b.nom, format: b.format,
      instructions: b.instructions,
      ts: b.type_score,
      nb: b.note_bloc,
      tw: b.tabata_work, tr: b.tabata_rest, tt: b.tabata_tours,
      er: b.emom_rounds, eim: b.emom_interval_min, eis: b.emom_interval_sec,
      ad: b.amrap_duree, ftl: b.for_time_limit,
      rich: b.rich_exercices.map(re => ({
        key: re._key,
        exId: re.exercise.id, exNom: re.exercise.nom,
        exGroupe: re.exercise.groupe_musculaire,
        exVideo: re.exercise.video_url,
        exThumb: re.exercise.miniature_url || ytThumb(re.exercise.video_url),
      })),
    })),
    note: d.note,
  });

  const flat_exercices = d.blocs.flatMap((b, bi) => {
    if (b.format !== "tabata") return [];
    return b.tabata_exercices.map((ex, ei) => ({
      exercise_id: ex.exercise_id,
      ordre: bi * 10000 + ei,
      series: ex.series ? parseInt(ex.series) : null,
      duree_secondes: ex.tabata_work ? parseInt(ex.tabata_work) : null,
      temps_repos: ex.tabata_rest ? parseInt(ex.tabata_rest) : null,
      notes: ex.notes || null,
    }));
  });

  return { description, flat_exercices };
}

export function decodeSeance(
  seance: Record<string, unknown>,
  exercices: Record<string, unknown>[],
): SeanceData {
  let meta: Record<string, unknown> = {};
  try {
    if ((seance.description as string)?.startsWith("{"))
      meta = JSON.parse(seance.description as string);
  } catch {}

  const blocs_meta = (meta.blocs as Record<string, unknown>[] | undefined) ?? [];
  const exByBlocIdx: Record<number, Record<string, unknown>[]> = {};
  for (const ex of exercices) {
    const bi = Math.floor(((ex.ordre as number) ?? 0) / 10000);
    if (!exByBlocIdx[bi]) exByBlocIdx[bi] = [];
    exByBlocIdx[bi].push(ex);
  }

  const blocs: Bloc[] = blocs_meta.length
    ? blocs_meta.map((bm, bi) => {
        const richRaw =
          (bm.rich as {
            key: string; exId: string; exNom: string; exGroupe: string;
            exVideo: string | null; exThumb: string | null;
          }[]) ?? [];
        const tabata_exercices = (exByBlocIdx[bi] ?? []).map(ex => {
          const exercise = ex.exercise as Exercise;
          return {
            _key: newKey(),
            exercise_id: exercise?.id ?? (ex.exercise_id as string),
            exercise,
            series: (ex.series as number | null)?.toString() ?? "",
            tabata_work: (ex.duree_secondes as number | null)?.toString() ?? "20",
            tabata_rest: (ex.temps_repos as number)?.toString() ?? "10",
            notes: (ex.notes as string | null) ?? "",
          };
        });
        return {
          _key: (bm.key as string) || newKey(),
          type: bm.type as BlocType,
          nom: (bm.nom as string) || "",
          format: (bm.format as string) || "classique",
          instructions: (bm.instructions as string) || "",
          type_score: (bm.ts as string) || "",
          note_bloc: (bm.nb as string) || "",
          tabata_work: (bm.tw as string) || "20",
          tabata_rest: (bm.tr as string) || "10",
          tabata_tours: (bm.tt as string) || "8",
          tabata_exercices,
          emom_rounds: (bm.er as string) || "10",
          emom_interval_min: (bm.eim as string) || "1",
          emom_interval_sec: (bm.eis as string) || "0",
          amrap_duree: (bm.ad as string) || "10",
          for_time_limit: (bm.ftl as string) || "20",
          rich_exercices: richRaw.map(r => ({
            _key: r.key || newKey(),
            exercise: {
              id: r.exId, nom: r.exNom, groupe_musculaire: r.exGroupe,
              materiel: "", video_url: r.exVideo, miniature_url: r.exThumb,
            },
          })),
        };
      })
    : [defaultBloc("echauffement"), defaultBloc("corps", 1)];

  return {
    nom: (seance.nom as string) || "",
    categorie: (meta.categorie as string) || "full_body",
    niveau: (meta.niveau as string) || "debutant",
    duree_estimee: (seance.duree_estimee as number | null)?.toString() || "45",
    note: (meta.note as string) || "",
    blocs,
  };
}

// ─── Video Modal ──────────────────────────────────────────────────────────────
function VideoModal({ url, nom, onClose }: { url: string; nom: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const embed = ytEmbed(url);
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:999,backgroundColor:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%",maxWidth:760 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
          <p style={{ color:"#F5F5F0",fontSize:13,fontWeight:700,margin:0,fontFamily:"system-ui" }}>{nom}</p>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,color:"#fff",fontSize:18,cursor:"pointer",padding:"3px 10px" }}>✕</button>
        </div>
        <div style={{ position:"relative",paddingBottom:"56.25%",height:0,borderRadius:10,overflow:"hidden",backgroundColor:"#000" }}>
          {embed
            ? <iframe src={embed} allow="autoplay;fullscreen" allowFullScreen style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none" }} />
            : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}><p style={{ color:"#888",fontFamily:"system-ui" }}>Lien non reconnu</p></div>}
        </div>
        <p style={{ color:"#444",fontSize:10,margin:"6px 0 0",textAlign:"center",fontFamily:"system-ui" }}>Échap ou clic extérieur pour fermer</p>
      </div>
    </div>
  );
}

// ─── Helpers sync description ↔ Mouvements ───────────────────────────────────
function extractExercisesFromHtml(html: string): Exercise[] {
  if (typeof window === "undefined" || !html) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return Array.from(doc.querySelectorAll("[data-ex-nom]")).map(s => ({
      id:               s.getAttribute("data-ex-id")    || "",
      nom:              s.getAttribute("data-ex-nom")   || "",
      video_url:        s.getAttribute("data-ex-video") || null,
      groupe_musculaire:s.getAttribute("data-ex-groupe")|| "",
      miniature_url:    s.getAttribute("data-ex-thumb") || null,
      materiel:         "",
    }));
  } catch { return []; }
}

export interface RichTextEditorHandle {
  removeExercise: (nom: string) => void;
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
const RichTextEditor = forwardRef<RichTextEditorHandle, {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  onVideoClick: (url: string, nom: string) => void;
  placeholder?: string;
}>(function RichTextEditor({ initialHtml, onHtmlChange, onVideoClick, placeholder }, ref) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = divRef.current;
    if (!div || document.activeElement === div) return;
    div.innerHTML = initialHtml || "";
  }, [initialHtml]);

  // Expose removeExercise aux parents (sync Mouvements → Description)
  useImperativeHandle(ref, () => ({
    removeExercise(nom: string) {
      const div = divRef.current;
      if (!div) return;
      div.querySelectorAll(`[data-ex-nom]`).forEach(s => {
        if (s.getAttribute("data-ex-nom") === nom) s.remove();
      });
      onHtmlChange(div.innerHTML);
    },
  }));

  function insertExerciseAtDrop(e: React.DragEvent, ex: Exercise) {
    const div = divRef.current;
    if (!div) return;
    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if ("caretPositionFromPoint" in document) {
      const pos = (document as unknown as { caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } }).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
    }
    if (!range || !div.contains(range.startContainer)) {
      range = document.createRange(); range.selectNodeContents(div); range.collapse(false);
    }

    // Span rouge/gras avec TOUTES les données pour le sync
    const span = document.createElement("span");
    span.setAttribute("contenteditable", "false");
    span.dataset.exId     = ex.id;
    span.dataset.exNom    = ex.nom;
    span.dataset.exVideo  = ex.video_url || "";
    span.dataset.exGroupe = ex.groupe_musculaire;
    span.dataset.exThumb  = ex.miniature_url || ytThumb(ex.video_url) || "";
    span.style.cssText    = "color:#B22222;font-weight:800;cursor:pointer;user-select:none;";
    span.textContent      = ex.nom;

    const sel = window.getSelection();
    sel?.removeAllRanges(); sel?.addRange(range);
    range.deleteContents(); range.insertNode(span);
    const after = document.createRange();
    after.setStartAfter(span); after.collapse(true);
    sel?.removeAllRanges(); sel?.addRange(after);
    div.focus();
    onHtmlChange(div.innerHTML);
  }

  const ph = placeholder || "Tape tes consignes… Glisse un exercice pour l'insérer en rouge et dans Mouvements.";

  return (
    <>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={ph}
        onInput={() => divRef.current && onHtmlChange(divRef.current.innerHTML)}
        onKeyUp={() => divRef.current && onHtmlChange(divRef.current.innerHTML)}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation();
          if (e.dataTransfer.getData("source") !== "bank") return;
          try { insertExerciseAtDrop(e, JSON.parse(e.dataTransfer.getData("exerciseData"))); } catch {}
        }}
        onClick={e => {
          const t = e.target as HTMLElement;
          if (t.dataset.exVideo && t.dataset.exNom) onVideoClick(t.dataset.exVideo, t.dataset.exNom);
        }}
        style={{
          minHeight: 80, padding: "8px 10px", borderRadius: 7,
          border: "1px solid #222", backgroundColor: "#0d0d0d",
          color: "#F5F5F0", fontSize: 12, fontFamily: "system-ui",
          outline: "none", lineHeight: 1.7, whiteSpace: "pre-wrap",
          wordBreak: "break-word", cursor: "text",
        }}
      />
      <style>{`[data-placeholder]:empty:before{content:attr(data-placeholder);color:#333;pointer-events:none;}`}</style>
    </>
  );
});

// ─── Exercise Bank (collapsible) ──────────────────────────────────────────────
function ExerciseBank({
  activeBlocKey, onDragStart, onAdd, collapsed, onToggleCollapse,
}: {
  activeBlocKey: string | null;
  onDragStart: () => void;
  onAdd: (ex: Exercise) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("tous");

  useEffect(() => {
    fetch("/api/coach/exercices").then(r => r.json()).then(d => setExercises(d.exercises ?? []));
  }, []);

  if (collapsed) {
    return (
      <div style={{ width: 32, backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, flexShrink: 0 }}>
        <button onClick={onToggleCollapse} title="Ouvrir la bibliothèque"
          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: 4 }}>⟫</button>
        <span style={{ marginTop: 10, writingMode: "vertical-rl", fontSize: 8, color: "#333", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "system-ui" }}>Bibliothèque</span>
      </div>
    );
  }

  const filtered = exercises.filter(ex =>
    (filterGroupe === "tous" || ex.groupe_musculaire === filterGroupe) &&
    (!search || ex.nom.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a", width: 260, flexShrink: 0 }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, fontFamily: "system-ui" }}>Bibliothèque d&apos;exercices</p>
          <button onClick={onToggleCollapse} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13, padding: 2 }}>⟪</button>
        </div>
        {activeBlocKey && (
          <p style={{ fontSize: 9, color: "#B22222", margin: "0 0 6px", fontFamily: "system-ui" }}>→ Clique ou glisse vers le bloc actif</p>
        )}
        <input
          type="search" placeholder="🔍 Rechercher…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 11, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", marginBottom: 5 }}
        />
        <select
          value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 10, fontFamily: "system-ui", outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
          <option value="tous">Tous les groupes</option>
          {GROUPES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map(ex => {
          const thumb = ex.miniature_url || ytThumb(ex.video_url);
          const color = GC[ex.groupe_musculaire] ?? "#888";
          return (
            <div key={ex.id} draggable
              onDragStart={e => {
                e.dataTransfer.setData("source", "bank");
                e.dataTransfer.setData("exerciseData", JSON.stringify(ex));
                onDragStart();
              }}
              onClick={() => onAdd(ex)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid #111", cursor: "pointer", backgroundColor: "#0D0D0D" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#111"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D0D"; }}>
              <div style={{ width: 36, height: 28, borderRadius: 5, overflow: "hidden", backgroundColor: "#1a1a1a", flexShrink: 0 }}>
                {thumb
                  ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🏋️</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#F5F5F0", margin: "0 0 2px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.nom}</p>
                <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 99, color, backgroundColor: `${color}20`, fontFamily: "system-ui" }}>{ex.groupe_musculaire}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "6px 12px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 8, color: "#2a2a2a", margin: 0, fontFamily: "system-ui" }}>⠿ Glisse ou clique pour ajouter au bloc actif</p>
      </div>
    </div>
  );
}

// ─── Timers ───────────────────────────────────────────────────────────────────
function useInterval(cb: () => void, delay: number | null) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

function TabataTimer({ workSec, restSec, rounds }: { workSec: number; restSec: number; rounds: number }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [currentRound, setCurrentRound] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const done = currentRound > rounds;
  const phaseDur = phase === "work" ? Math.max(1, workSec) : Math.max(1, restSec);
  const remaining = Math.max(0, phaseDur - elapsed);
  const rm = Math.floor(remaining / 60); const rs = remaining % 60;

  useInterval(() => {
    if (done) { setRunning(false); return; }
    const next = elapsed + 1;
    if (next >= phaseDur) {
      if (phase === "work") { setPhase("rest"); setElapsed(0); }
      else if (currentRound >= rounds) { setRunning(false); setCurrentRound(rounds + 1); }
      else { setPhase("work"); setCurrentRound(r => r + 1); setElapsed(0); }
    } else { setElapsed(next); }
  }, running && !done ? 1000 : null);

  function reset() { setRunning(false); setPhase("work"); setCurrentRound(1); setElapsed(0); }
  const phaseColor = phase === "work" ? "#EF4444" : "#10B981";

  return (
    <div style={{ backgroundColor: "#0a0a0a", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e1e1e" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui" }}>
            {done ? "TERMINÉ" : `${phase === "work" ? "EFFORT" : "REPOS"} — Round ${Math.min(currentRound, rounds)}/${rounds}`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRunning(r => !r)} disabled={done}
            style={{ padding: "4px 10px", borderRadius: 6, border: "none", backgroundColor: done ? "#1a1a1a" : running ? "#333" : phaseColor, color: done ? "#444" : "#fff", fontSize: 10, fontWeight: 700, cursor: done ? "default" : "pointer", fontFamily: "system-ui" }}>
            {done ? "FIN" : running ? "⏸" : "▶"}
          </button>
          <button onClick={reset} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #222", backgroundColor: "transparent", color: "#555", fontSize: 10, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: done ? "#444" : phaseColor, fontFamily: "system-ui", minWidth: 64 }}>
          {rm > 0 ? `${rm}:` : ""}{String(rs).padStart(2, "0")}
        </span>
        <div style={{ flex: 1, height: 5, backgroundColor: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${done ? 100 : ((elapsed / phaseDur) * 100)}%`, backgroundColor: done ? "#333" : phaseColor, transition: "width 1s linear", borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function EmomTimer({ rounds, intervalSec }: { rounds: number; intervalSec: number }) {
  const inter = Math.max(1, intervalSec);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const total = rounds * inter;
  useInterval(() => { if (elapsed < total) setElapsed(e => e + 1); else setRunning(false); }, running ? 1000 : null);
  const currentRound = Math.min(Math.floor(elapsed / inter) + 1, rounds);
  const remaining = inter - (elapsed % inter);
  const rm = Math.floor(remaining / 60); const rs = remaining % 60;
  return (
    <div style={{ backgroundColor: "#0a0a0a", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e1e1e" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui" }}>EMOM — Round {currentRound}/{rounds}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRunning(r => !r)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", backgroundColor: running ? "#333" : "#3B82F6", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>{running ? "⏸" : "▶"}</button>
          <button onClick={() => { setRunning(false); setElapsed(0); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #222", backgroundColor: "transparent", color: "#555", fontSize: 10, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: remaining <= 10 ? "#EF4444" : "#60A5FA", fontFamily: "system-ui", minWidth: 64 }}>{rm > 0 ? `${rm}:` : ""}{String(rs).padStart(2, "0")}</span>
        <div style={{ flex: 1, height: 5, backgroundColor: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(elapsed / total) * 100}%`, backgroundColor: "#3B82F6", transition: "width 1s linear", borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function AmrapTimer({ totalMin }: { totalMin: number }) {
  const total = totalMin * 60;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useInterval(() => { if (elapsed < total) setElapsed(e => e + 1); else setRunning(false); }, running ? 1000 : null);
  const remaining = Math.max(0, total - elapsed);
  const m = Math.floor(remaining / 60); const s = remaining % 60;
  const alert = remaining <= 30 && running && elapsed > 0;
  return (
    <div style={{ backgroundColor: "#0a0a0a", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e1e1e" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui" }}>AMRAP — {totalMin} min</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRunning(r => !r)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", backgroundColor: running ? "#333" : "#8B5CF6", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>{running ? "⏸" : "▶"}</button>
          <button onClick={() => { setRunning(false); setElapsed(0); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #222", backgroundColor: "transparent", color: "#555", fontSize: 10, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: alert ? "#EF4444" : "#8B5CF6", fontFamily: "system-ui", minWidth: 64 }}>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
        <div style={{ flex: 1, height: 5, backgroundColor: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(elapsed / total) * 100}%`, backgroundColor: alert ? "#EF4444" : "#8B5CF6", transition: "width 1s linear", borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function ForTimeTimer({ limitMin }: { limitMin: number }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const limit = limitMin * 60;
  useInterval(() => { setElapsed(e => e + 1); }, running ? 1000 : null);
  const m = Math.floor(elapsed / 60); const s = elapsed % 60;
  const over = limit > 0 && elapsed >= limit;
  return (
    <div style={{ backgroundColor: "#0a0a0a", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e1e1e" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui" }}>FOR TIME{limit > 0 ? ` — limite ${limitMin} min` : ""}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { if (!over) setRunning(r => !r); }} disabled={over}
            style={{ padding: "4px 10px", borderRadius: 6, border: "none", backgroundColor: over ? "#1a1a1a" : running ? "#333" : "#10B981", color: over ? "#444" : "#fff", fontSize: 10, fontWeight: 700, cursor: over ? "default" : "pointer", fontFamily: "system-ui" }}>
            {over ? "FIN" : running ? "⏸" : "▶"}
          </button>
          <button onClick={() => { setRunning(false); setElapsed(0); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #222", backgroundColor: "transparent", color: "#555", fontSize: 10, cursor: "pointer", fontFamily: "system-ui" }}>↺</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: over ? "#EF4444" : "#10B981", fontFamily: "system-ui", minWidth: 64 }}>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
        {limit > 0 && (
          <div style={{ flex: 1, height: 5, backgroundColor: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (elapsed / limit) * 100)}%`, backgroundColor: over ? "#EF4444" : "#10B981", transition: "width 1s linear", borderRadius: 99 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bloc Card (style Azeoo) ───────────────────────────────────────────────────
function BlocCard({
  bloc, blocNum, corpsTotal, onBlocChange, onBlocRemove, isActive, onDrop,
}: {
  bloc: Bloc;
  blocNum: number;
  corpsTotal: number;
  onBlocChange: (key: string, changes: Partial<Bloc>) => void;
  onBlocRemove: (key: string) => void;
  isActive: boolean;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [showMovements, setShowMovements] = useState(true);
  const [videoUrl, setVideoUrl] = useState<{ url: string; nom: string } | null>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  // Sync Description → Mouvements : quand le HTML change, on recalcule rich_exercices
  function handleDescriptionChange(html: string) {
    if (bloc.format === "tabata") {
      onBlocChange(bloc._key, { instructions: html });
      return;
    }
    const exes = extractExercisesFromHtml(html);
    const fromDescNoms = new Set(exes.map(e => e.nom));
    // Garde les exercices ajoutés directement dans Mouvements (pas via description)
    const directOnly = bloc.rich_exercices.filter(
      re => !fromDescNoms.has(re.exercise.nom) && !re._key.startsWith("desc_")
    );
    const newRich = [
      ...exes.map(e => ({ _key: `desc_${e.id || e.nom}`, exercise: e })),
      ...directOnly,
    ];
    onBlocChange(bloc._key, { instructions: html, rich_exercices: newRich });
  }

  const color = BCOLORS[bloc.type];
  const multiWod = bloc.type === "corps" && corpsTotal > 1;
  const label = multiWod ? `WOD ${blocNum}` : BLOC_LABELS[bloc.type];

  const exercises = bloc.format === "tabata"
    ? bloc.tabata_exercices.map(ti => ({ _key: ti._key, exercise: ti.exercise }))
    : bloc.rich_exercices;

  const inp: React.CSSProperties = {
    padding: "4px 7px", borderRadius: 5, border: "1px solid #2a2a2a",
    backgroundColor: "#1a1a1a", color: "#F5F5F0", fontSize: 11,
    fontFamily: "system-ui", outline: "none",
  };

  const rowSep: React.CSSProperties = {
    borderBottom: "1px solid #1e1e1e", paddingBottom: 10, marginBottom: 10,
  };

  const intervalSec = (parseInt(bloc.emom_interval_min) || 0) * 60 + (parseInt(bloc.emom_interval_sec) || 0);

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (e.dataTransfer.getData("source") !== "bank") return; onDrop(e); }}
      style={{
        width: 370, flexShrink: 0,
        backgroundColor: "#111",
        border: `1px solid ${isActive ? color : "#1e1e1e"}`,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s",
      }}>

      {/* ── Header ── */}
      <div style={{ padding: "11px 14px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0d0d0d" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 14, backgroundColor: color, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: "#666", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "system-ui" }}>{label}</span>
        </div>
        {(bloc.type !== "corps" || corpsTotal > 1) && (
          <button onClick={() => onBlocRemove(bloc._key)}
            style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13, padding: "2px 4px", lineHeight: 1 }}
            title="Supprimer ce bloc">✕</button>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", flex: 1 }}>

        {/* Nom du bloc */}
        <div style={{ ...rowSep, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={bloc.nom}
            onChange={e => onBlocChange(bloc._key, { nom: e.target.value })}
            placeholder={`Saisissez un nom (ex: ${bloc.type === "echauffement" ? "échauffement haut du corps" : bloc.type === "finisher" ? "finisher cardio" : "Fran"})`}
            style={{ flex: 1, background: "none", border: "none", color: "#F5F5F0", fontSize: 13, fontWeight: 700, fontFamily: "system-ui", outline: "none" }}
          />
          <span style={{ color: "#2a2a2a", fontSize: 12 }}>✏</span>
        </div>

        {/* WOD — Timer complet (format select + config + live timer) */}
        {bloc.type === "corps" && (
          <div style={{ ...rowSep }}>
            {/* Format select */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui", minWidth: 50 }}>Timer</span>
              <select
                value={bloc.format}
                onChange={e => onBlocChange(bloc._key, { format: e.target.value })}
                style={{ ...inp, flex: 1, cursor: "pointer", color: bloc.format !== "classique" ? color : "#888", fontWeight: bloc.format !== "classique" ? 700 : 400 }}>
                {FORMATS.map(f => <option key={f.value} value={f.value} style={{ backgroundColor: "#1a1a1a" }}>{f.label}</option>)}
              </select>
            </div>

            {/* Config fields (toujours visible si format != classique) */}
            {bloc.format !== "classique" && (
              <div style={{ padding: "8px 10px", backgroundColor: "#0a0a0a", borderRadius: 8, border: "1px solid #1e1e1e", marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {bloc.format === "tabata" && <>
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>Effort</label>
                  <input style={{ ...inp, width: 52 }} type="number" min="1" value={bloc.tabata_work} onChange={e => onBlocChange(bloc._key, { tabata_work: e.target.value })} />
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>s · Repos</label>
                  <input style={{ ...inp, width: 52 }} type="number" min="1" value={bloc.tabata_rest} onChange={e => onBlocChange(bloc._key, { tabata_rest: e.target.value })} />
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>s · Tours</label>
                  <input style={{ ...inp, width: 52 }} type="number" min="1" value={bloc.tabata_tours} onChange={e => onBlocChange(bloc._key, { tabata_tours: e.target.value })} />
                </>}
                {bloc.format === "emom" && <>
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>Rounds</label>
                  <input style={{ ...inp, width: 52 }} type="number" min="1" value={bloc.emom_rounds} onChange={e => onBlocChange(bloc._key, { emom_rounds: e.target.value })} />
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>· Intervalle</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={bloc.emom_interval_min} onChange={e => onBlocChange(bloc._key, { emom_interval_min: e.target.value })}>
                    {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i} min</option>)}
                  </select>
                  <select style={{ ...inp, cursor: "pointer" }} value={bloc.emom_interval_sec} onChange={e => onBlocChange(bloc._key, { emom_interval_sec: e.target.value })}>
                    {[0,5,10,15,20,25,30,35,40,45,50,55].map(s => <option key={s} value={s}>{String(s).padStart(2,"0")}s</option>)}
                  </select>
                </>}
                {bloc.format === "amrap" && <>
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>Durée</label>
                  <input style={{ ...inp, width: 60 }} type="number" min="1" value={bloc.amrap_duree} onChange={e => onBlocChange(bloc._key, { amrap_duree: e.target.value })} />
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>min</label>
                </>}
                {bloc.format === "for_time" && <>
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>Limite</label>
                  <input style={{ ...inp, width: 60 }} type="number" min="0" value={bloc.for_time_limit} onChange={e => onBlocChange(bloc._key, { for_time_limit: e.target.value })} />
                  <label style={{ fontSize: 9, color: "#666", fontFamily: "system-ui" }}>min</label>
                </>}
              </div>
            )}

            {/* Live timer widget */}
            {bloc.format === "tabata" && <TabataTimer workSec={parseInt(bloc.tabata_work)||20} restSec={parseInt(bloc.tabata_rest)||10} rounds={parseInt(bloc.tabata_tours)||8} />}
            {bloc.format === "emom" && <EmomTimer rounds={parseInt(bloc.emom_rounds)||10} intervalSec={intervalSec||60} />}
            {bloc.format === "amrap" && <AmrapTimer totalMin={parseInt(bloc.amrap_duree)||10} />}
            {bloc.format === "for_time" && <ForTimeTimer limitMin={parseInt(bloc.for_time_limit)||0} />}
          </div>
        )}

        {/* Description (tous les blocs) */}
        <div style={{ ...rowSep }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555", fontFamily: "system-ui" }}>Description</span>
            <span style={{ color: "#2a2a2a", fontSize: 12 }}>✏</span>
          </div>
          <RichTextEditor
            ref={editorRef}
            initialHtml={bloc.instructions}
            onHtmlChange={handleDescriptionChange}
            onVideoClick={(url, nom) => setVideoUrl({ url, nom })}
            placeholder="Redigez la description… Glisse un exercice pour l’insérer en rouge et dans Mouvements."
          />
        </div>

        {/* Mouvements */}
        <div style={{ ...rowSep }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555", fontFamily: "system-ui" }}>Mouvements</span>
            <button onClick={() => setShowMovements(m => !m)}
              style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 11, padding: 2 }}>
              {showMovements ? "▲" : "▼"}
            </button>
          </div>

          {showMovements && (
            <div onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.getData("source") !== "bank") return; onDrop(e); }}
              style={{ minHeight: 40 }}>
              {exercises.map(re => {
                const thumb = re.exercise?.miniature_url || ytThumb(re.exercise?.video_url);
                const groupes = re.exercise?.groupe_musculaire?.split(",").map(g => g.trim()).filter(Boolean) ?? [];
                const fallbackColor = GC[re.exercise?.groupe_musculaire] ?? "#888";
                const hasVideo = !!re.exercise?.video_url;
                return (
                  <div key={re._key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", backgroundColor: "#0d0d0d", borderRadius: 8, marginBottom: 6, border: "1px solid #1a1a1a" }}>
                    {/* Miniature cliquable → ouvre la vidéo */}
                    <div
                      onClick={() => hasVideo && setVideoUrl({ url: re.exercise.video_url!, nom: re.exercise.nom })}
                      style={{ width: 50, height: 38, borderRadius: 6, overflow: "hidden", backgroundColor: "#1a1a1a", flexShrink: 0, cursor: hasVideo ? "pointer" : "default", position: "relative" }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏋️</div>}
                      {hasVideo && (
                        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>▶</div>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        onClick={() => hasVideo && setVideoUrl({ url: re.exercise.video_url!, nom: re.exercise.nom })}
                        style={{ fontSize: 12, fontWeight: 700, color: hasVideo ? "#B22222" : "#F5F5F0", margin: "0 0 4px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: hasVideo ? "pointer" : "default" }}>
                        {re.exercise?.nom}
                      </p>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {groupes.length > 0
                          ? groupes.map(g => (
                              <span key={g} style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 99, color: GC[g] ?? "#888", backgroundColor: `${GC[g] ?? "#888"}20`, fontFamily: "system-ui" }}>{g}</span>
                            ))
                          : <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 99, color: fallbackColor, backgroundColor: `${fallbackColor}20`, fontFamily: "system-ui" }}>{re.exercise?.groupe_musculaire}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (bloc.format === "tabata") {
                          onBlocChange(bloc._key, { tabata_exercices: bloc.tabata_exercices.filter(t => t._key !== re._key) });
                        } else {
                          // Sync bidirectionnel : supprime aussi du span dans la description
                          editorRef.current?.removeExercise(re.exercise.nom);
                          onBlocChange(bloc._key, { rich_exercices: bloc.rich_exercices.filter(r => r._key !== re._key) });
                        }
                      }}
                      style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 12, padding: 2 }}>✕</button>
                  </div>
                );
              })}
              {exercises.length === 0 && (
                <p style={{ fontSize: 10, color: "#2a2a2a", margin: 0, textAlign: "center", fontFamily: "system-ui", padding: "10px 0" }}>
                  Glisse un exercice depuis la bibliothèque
                </p>
              )}
            </div>
          )}
        </div>

        {/* Note */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <textarea
            value={bloc.note_bloc}
            onChange={e => onBlocChange(bloc._key, { note_bloc: e.target.value })}
            placeholder="Redigez une note…"
            rows={2}
            style={{ flex: 1, background: "none", border: "none", color: "#666", fontSize: 11, fontFamily: "system-ui", outline: "none", resize: "none", padding: 0 }}
          />
          <span style={{ color: "#2a2a2a", fontSize: 12, paddingTop: 2 }}>✏</span>
        </div>
      </div>

      {videoUrl && <VideoModal url={videoUrl.url} nom={videoUrl.nom} onClose={() => setVideoUrl(null)} />}
    </div>
  );
}

// ─── Builder principal ────────────────────────────────────────────────────────
export interface SeanceBuilderProps {
  data: SeanceData;
  onChange: (data: SeanceData) => void;
}

export default function SeanceBuilder({ data, onChange }: SeanceBuilderProps) {
  const [bankCollapsed, setBankCollapsed] = useState(false);
  const [activeBlocKey, setActiveBlocKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateBloc = useCallback((key: string, changes: Partial<Bloc>) => {
    onChange({ ...data, blocs: data.blocs.map(b => b._key === key ? { ...b, ...changes } : b) });
  }, [data, onChange]);

  const removeBloc = useCallback((key: string) => {
    setActiveBlocKey(prev => prev === key ? null : prev);
    onChange({ ...data, blocs: data.blocs.filter(b => b._key !== key) });
  }, [data, onChange]);

  const addCorpsBloc = useCallback(() => {
    const n = data.blocs.filter(b => b.type === "corps").length + 1;
    const newBloc = defaultBloc("corps", n);
    const finIdx = data.blocs.findIndex(b => b.type === "finisher");
    const blocs = [...data.blocs];
    if (finIdx >= 0) blocs.splice(finIdx, 0, newBloc); else blocs.push(newBloc);
    onChange({ ...data, blocs });
    // auto-scroll to new bloc
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
      }
    }, 50);
  }, [data, onChange]);

  const toggleFinisher = useCallback(() => {
    const has = data.blocs.some(b => b.type === "finisher");
    if (has) onChange({ ...data, blocs: data.blocs.filter(b => b.type !== "finisher") });
    else onChange({ ...data, blocs: [...data.blocs, defaultBloc("finisher")] });
  }, [data, onChange]);

  function handleAddFromBank(ex: Exercise) {
    if (!activeBlocKey) {
      // Si aucun bloc actif, ajouter au premier bloc corps ou au premier bloc
      const target = data.blocs.find(b => b.type === "corps") ?? data.blocs[0];
      if (!target) return;
      addExToBloc(target._key, ex);
      return;
    }
    addExToBloc(activeBlocKey, ex);
  }

  function addExToBloc(blocKey: string, ex: Exercise) {
    const bloc = data.blocs.find(b => b._key === blocKey);
    if (!bloc) return;
    if (bloc.format === "tabata") {
      const item: TabataItem = { _key: newKey(), exercise_id: ex.id, exercise: ex, series: "", tabata_work: bloc.tabata_work, tabata_rest: bloc.tabata_rest, notes: "" };
      updateBloc(blocKey, { tabata_exercices: [...bloc.tabata_exercices, item] });
    } else {
      updateBloc(blocKey, { rich_exercices: [...bloc.rich_exercices, { _key: newKey(), exercise: ex }] });
    }
  }

  function handleDropOnBloc(e: React.DragEvent, blocKey: string) {
    try {
      const ex = JSON.parse(e.dataTransfer.getData("exerciseData")) as Exercise;
      addExToBloc(blocKey, ex);
    } catch {}
  }

  function scrollToBloc(idx: number) {
    if (!scrollRef.current) return;
    const cards = scrollRef.current.querySelectorAll("[data-bloc-card]");
    if (cards[idx]) {
      (cards[idx] as HTMLElement).scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    setActiveBlocKey(data.blocs[idx]._key);
  }

  const hasFinisher = data.blocs.some(b => b.type === "finisher");

  // Build nav items
  let corpsCount = 0;
  const navItems = data.blocs.map((bloc, idx) => {
    if (bloc.type === "corps") corpsCount++;
    const corpsTotal = data.blocs.filter(b => b.type === "corps").length;
    const navLabel = bloc.type === "corps" && corpsTotal > 1
      ? `WOD ${corpsCount}`
      : BLOC_LABELS[bloc.type];
    return { bloc, idx, navLabel };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: bankCollapsed ? "32px 1fr" : "260px 1fr", border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden", minHeight: 560, transition: "grid-template-columns 0.2s ease" }}>
      <ExerciseBank
        activeBlocKey={activeBlocKey}
        onDragStart={() => {}}
        onAdd={handleAddFromBank}
        collapsed={bankCollapsed}
        onToggleCollapse={() => setBankCollapsed(c => !c)}
      />

      <div style={{ backgroundColor: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Controls row */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button onClick={addCorpsBloc}
            style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>+</span> Ajouter un bloc
          </button>
          <button onClick={toggleFinisher}
            style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${hasFinisher ? "#8B5CF6" : "#2a2a2a"}`, backgroundColor: hasFinisher ? "rgba(139,92,246,0.08)" : "transparent", color: hasFinisher ? "#8B5CF6" : "#555", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>
            {hasFinisher ? "🏁 Retirer cool down" : "+ Cool down"}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, backgroundColor: "#161616", border: "1px solid #2a2a2a" }}>
            <span style={{ fontSize: 12 }}>⏱</span>
            <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui" }}>Durée :</span>
            <input
              type="number" min="1"
              value={data.duree_estimee}
              onChange={e => onChange({ ...data, duree_estimee: e.target.value })}
              style={{ width: 52, padding: "3px 6px", borderRadius: 6, border: "1px solid #2a2a2a", backgroundColor: "#0d0d0d", color: "#F5F5F0", fontSize: 13, fontWeight: 700, fontFamily: "system-ui", outline: "none", textAlign: "center" }}
            />
            <span style={{ fontSize: 11, color: "#555", fontFamily: "system-ui" }}>min</span>
          </div>
        </div>

        {/* Circle navigation */}
        <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", overflowX: "auto", flexShrink: 0, gap: 0 }}>
          {navItems.map(({ bloc, idx, navLabel }, i) => {
            const c = BCOLORS[bloc.type];
            const isAct = activeBlocKey === bloc._key;
            return (
              <div key={bloc._key} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div style={{ width: 24, height: 2, backgroundColor: "#1e1e1e", flexShrink: 0 }} />}
                <button onClick={() => scrollToBloc(idx)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 10px", flexShrink: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${isAct ? c : "#2a2a2a"}`, backgroundColor: isAct ? `${c}18` : "#111", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: isAct ? c : "#444", fontFamily: "system-ui" }}>{idx + 1}</span>
                  </div>
                  <span style={{ fontSize: 8, color: isAct ? c : "#3a3a3a", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui", fontWeight: isAct ? 800 : 500, whiteSpace: "nowrap" }}>{navLabel}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Horizontal scroll area */}
        <div
          ref={scrollRef}
          style={{ flex: 1, display: "flex", gap: 16, overflowX: "auto", padding: "16px", alignItems: "flex-start" }}>
          {(() => {
            let ci = 0;
            const corpsTotal = data.blocs.filter(b => b.type === "corps").length;
            return data.blocs.map(bloc => {
              if (bloc.type === "corps") ci++;
              return (
                <div key={bloc._key} data-bloc-card style={{ flexShrink: 0 }}>
                  <BlocCard
                    bloc={bloc}
                    blocNum={ci}
                    corpsTotal={corpsTotal}
                    onBlocChange={updateBloc}
                    onBlocRemove={removeBloc}
                    isActive={activeBlocKey === bloc._key}
                    onDrop={e => handleDropOnBloc(e, bloc._key)}
                  />
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
