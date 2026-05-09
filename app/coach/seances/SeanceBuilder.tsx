"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string; nom: string; groupe_musculaire: string; materiel: string;
  video_url: string | null; miniature_url: string | null;
}
export interface TabataItem {
  _key: string; exercise_id: string; exercise: Exercise;
  series: string; tabata_work: string; tabata_rest: string; notes: string;
}
export interface RichExercise {
  _key: string; exercise: Exercise;
}
export type BlocType = "echauffement" | "corps" | "finisher";
export interface Bloc {
  _key: string; type: BlocType; nom: string; format: string;
  instructions: string;
  // Tabata only
  tabata_work: string; tabata_rest: string; tabata_tours: string;
  tabata_exercices: TabataItem[];
  // EMOM
  emom_rounds: string; emom_interval_min: string; emom_interval_sec: string;
  // AMRAP
  amrap_duree: string;
  // For Time
  for_time_limit: string;
  // Rich exercices (non-tabata)
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
  { value: "full_body",    label: "Full Body" },
  { value: "bas_du_corps", label: "Bas du corps" },
  { value: "haut_du_corps",label: "Haut du corps" },
  { value: "stretching",   label: "Stretching" },
];
export const NIVEAUX = [
  { value: "debutant",      label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance",        label: "Avancé" },
];
const GROUPES = ["Quadriceps","Ischiojambier","Fessier","Abducteur","Adducteur",
  "Abdominaux","Biceps","Triceps","Pec","Dos","Lombaire","Épaule","Coeur"];
const GC: Record<string,string> = {
  "Quadriceps":"#3B82F6","Ischiojambier":"#8B5CF6","Fessier":"#EC4899",
  "Abducteur":"#F59E0B","Adducteur":"#F97316","Abdominaux":"#EF4444",
  "Biceps":"#10B981","Triceps":"#06B6D4","Pec":"#F97316",
  "Dos":"#8B5CF6","Lombaire":"#84CC16","Épaule":"#B22222","Coeur":"#EF4444",
};
let _k = 0;
export function newKey() { return `k${++_k}_${Date.now()}`; }
function ytThumb(url: string|null) {
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

  // seance_exercices: tabata exercises only
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

export function decodeSeance(seance: Record<string,unknown>, exercices: Record<string,unknown>[]): SeanceData {
  let meta: Record<string,unknown> = {};
  try { if ((seance.description as string)?.startsWith("{")) meta = JSON.parse(seance.description as string); } catch {}

  const blocs_meta = (meta.blocs as Record<string,unknown>[] | undefined) ?? [];
  const exByBlocIdx: Record<number, Record<string,unknown>[]> = {};
  for (const ex of exercices) {
    const bi = Math.floor(((ex.ordre as number)??0) / 10000);
    if (!exByBlocIdx[bi]) exByBlocIdx[bi] = [];
    exByBlocIdx[bi].push(ex);
  }

  const blocs: Bloc[] = blocs_meta.length ? blocs_meta.map((bm, bi) => {
    const richRaw = (bm.rich as {key:string;exId:string;exNom:string;exGroupe:string;exVideo:string|null;exThumb:string|null}[]) ?? [];
    const tabata_exercices = (exByBlocIdx[bi] ?? []).map(ex => {
      const exercise = ex.exercise as Exercise;
      return {
        _key: newKey(), exercise_id: exercise?.id ?? (ex.exercise_id as string),
        exercise,
        series: (ex.series as number|null)?.toString() ?? "",
        tabata_work: (ex.duree_secondes as number|null)?.toString() ?? "20",
        tabata_rest: (ex.temps_repos as number)?.toString() ?? "10",
        notes: (ex.notes as string|null) ?? "",
      };
    });
    return {
      _key: (bm.key as string) || newKey(),
      type: bm.type as BlocType,
      nom: (bm.nom as string) || "",
      format: (bm.format as string) || "classique",
      instructions: (bm.instructions as string) || "",
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
        exercise: { id: r.exId, nom: r.exNom, groupe_musculaire: r.exGroupe, materiel: "",
          video_url: r.exVideo, miniature_url: r.exThumb },
      })),
    };
  }) : [defaultBloc("echauffement"), defaultBloc("corps", 1)];

  return {
    nom: (seance.nom as string) || "",
    categorie: (meta.categorie as string) || "full_body",
    niveau: (meta.niveau as string) || "debutant",
    duree_estimee: (seance.duree_estimee as number|null)?.toString() || "45",
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
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%",maxWidth:760 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
          <p style={{ color:"#F5F5F0",fontSize:13,fontWeight:700,margin:0,fontFamily:"system-ui" }}>{nom}</p>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,color:"#fff",fontSize:18,cursor:"pointer",padding:"3px 10px" }}>✕</button>
        </div>
        <div style={{ position:"relative",paddingBottom:"56.25%",height:0,borderRadius:10,overflow:"hidden",backgroundColor:"#000" }}>
          {embed ? <iframe src={embed} allow="autoplay;fullscreen" allowFullScreen style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none" }} /> : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}><p style={{ color:"#888",fontFamily:"system-ui" }}>Lien non reconnu</p></div>}
        </div>
        <p style={{ color:"#444",fontSize:10,margin:"6px 0 0",textAlign:"center",fontFamily:"system-ui" }}>Échap ou clic extérieur pour fermer</p>
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

function AmrapTimer({ totalMin }: { totalMin: number }) {
  const total = totalMin * 60;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useInterval(() => { if (elapsed < total) setElapsed(e => e + 1); else setRunning(false); }, running ? 1000 : null);
  const remaining = Math.max(0, total - elapsed);
  const m = Math.floor(remaining / 60); const s = remaining % 60;
  const pct = total > 0 ? (elapsed / total) * 100 : 0;
  const alert = remaining <= 30 && running && elapsed > 0;
  return (
    <div style={{ backgroundColor:"#161616",borderRadius:8,padding:"10px 14px" }}>
      <p style={{ fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px",fontFamily:"system-ui" }}>AMRAP — {totalMin} min</p>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <p style={{ fontSize:30,fontWeight:800,color:alert?"#EF4444":"#F5F5F0",margin:0,fontFamily:"system-ui",minWidth:80 }}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</p>
        <div style={{ flex:1,height:5,backgroundColor:"#222",borderRadius:99,overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${pct}%`,backgroundColor:alert?"#EF4444":"#B22222",transition:"width 1s linear",borderRadius:99 }} />
        </div>
        <button onClick={()=>setRunning(r=>!r)} style={{ padding:"5px 12px",borderRadius:6,border:"none",backgroundColor:running?"#333":"#B22222",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"system-ui" }}>{running?"⏸":"▶"}</button>
        <button onClick={()=>{setRunning(false);setElapsed(0);}} style={{ padding:"5px 8px",borderRadius:6,border:"1px solid #222",backgroundColor:"transparent",color:"#666",fontSize:11,cursor:"pointer",fontFamily:"system-ui" }}>↺</button>
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
    <div style={{ backgroundColor:"#161616",borderRadius:8,padding:"10px 14px" }}>
      <p style={{ fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px",fontFamily:"system-ui" }}>FOR TIME{limit>0?` — limite ${limitMin} min`:""}</p>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <p style={{ fontSize:30,fontWeight:800,color:over?"#EF4444":"#10B981",margin:0,fontFamily:"system-ui",minWidth:80 }}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</p>
        {limit > 0 && (
          <div style={{ flex:1,height:5,backgroundColor:"#222",borderRadius:99,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${Math.min(100,(elapsed/limit)*100)}%`,backgroundColor:over?"#EF4444":"#10B981",transition:"width 1s linear",borderRadius:99 }} />
          </div>
        )}
        <button onClick={()=>{if(!over)setRunning(r=>!r);}} disabled={over} style={{ padding:"5px 12px",borderRadius:6,border:"none",backgroundColor:over?"#1a1a1a":running?"#333":"#10B981",color:over?"#444":"#fff",fontSize:11,fontWeight:700,cursor:over?"default":"pointer",fontFamily:"system-ui" }}>{over?"TERMINÉ":running?"⏸":"▶ Start"}</button>
        <button onClick={()=>{setRunning(false);setElapsed(0);}} style={{ padding:"5px 8px",borderRadius:6,border:"1px solid #222",backgroundColor:"transparent",color:"#666",fontSize:11,cursor:"pointer",fontFamily:"system-ui" }}>↺</button>
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
  const secInInter = elapsed % inter;
  const remaining = inter - secInInter;
  const rm = Math.floor(remaining / 60); const rs = remaining % 60;
  return (
    <div style={{ backgroundColor:"#161616",borderRadius:8,padding:"10px 14px" }}>
      <p style={{ fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px",fontFamily:"system-ui" }}>EMOM — Round {currentRound}/{rounds}</p>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <div>
          <p style={{ fontSize:10,color:"#444",margin:"0 0 2px",fontFamily:"system-ui" }}>Prochain dans</p>
          <p style={{ fontSize:26,fontWeight:800,color:remaining<=10?"#EF4444":"#60A5FA",margin:0,fontFamily:"system-ui" }}>{rm>0?`${rm}:`:""}:{String(rs).padStart(2,"0")}</p>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ height:5,backgroundColor:"#222",borderRadius:99,overflow:"hidden",marginBottom:4 }}>
            <div style={{ height:"100%",width:`${(elapsed/total)*100}%`,backgroundColor:"#3B82F6",transition:"width 1s linear",borderRadius:99 }} />
          </div>
          <p style={{ fontSize:9,color:"#444",margin:0,fontFamily:"system-ui" }}>{elapsed}s / {total}s</p>
        </div>
        <button onClick={()=>setRunning(r=>!r)} style={{ padding:"5px 12px",borderRadius:6,border:"none",backgroundColor:running?"#333":"#3B82F6",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"system-ui" }}>{running?"⏸":"▶"}</button>
        <button onClick={()=>{setRunning(false);setElapsed(0);}} style={{ padding:"5px 8px",borderRadius:6,border:"1px solid #222",backgroundColor:"transparent",color:"#666",fontSize:11,cursor:"pointer",fontFamily:"system-ui" }}>↺</button>
      </div>
    </div>
  );
}

// ─── Banque d'exercices ───────────────────────────────────────────────────────
function ExerciseBank({ onDragStart }: { onDragStart: (ex: Exercise) => void }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("tous");
  useEffect(() => { fetch("/api/coach/exercices").then(r=>r.json()).then(d=>setExercises(d.exercises??[])); }, []);
  const filtered = exercises.filter(ex =>
    (filterGroupe==="tous"||ex.groupe_musculaire===filterGroupe) &&
    (!search||ex.nom.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",backgroundColor:"#0D0D0D",borderRight:"1px solid #1a1a1a" }}>
      <div style={{ padding:"12px 14px",borderBottom:"1px solid #1a1a1a",flexShrink:0 }}>
        <p style={{ fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px",fontFamily:"system-ui" }}>Banque d&apos;exercices</p>
        <input type="search" placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:"100%",padding:"6px 9px",borderRadius:6,border:"1px solid #1e1e1e",backgroundColor:"#161616",color:"#F5F5F0",fontSize:11,fontFamily:"system-ui",outline:"none",boxSizing:"border-box",marginBottom:5 }} />
        <select value={filterGroupe} onChange={e=>setFilterGroupe(e.target.value)} style={{ width:"100%",padding:"5px 7px",borderRadius:6,border:"1px solid #1e1e1e",backgroundColor:"#161616",color:"#F5F5F0",fontSize:10,fontFamily:"system-ui",outline:"none",cursor:"pointer",boxSizing:"border-box" }}>
          <option value="tous">Tous</option>
          {GROUPES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ flex:1,overflowY:"auto" }}>
        {filtered.map(ex => {
          const thumb = ex.miniature_url||ytThumb(ex.video_url);
          const color = GC[ex.groupe_musculaire]??"#888";
          return (
            <div key={ex.id} draggable
              onDragStart={e=>{ e.dataTransfer.setData("exerciseData",JSON.stringify(ex)); onDragStart(ex); }}
              style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid #111",cursor:"grab",backgroundColor:"#0D0D0D" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.backgroundColor="#111";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.backgroundColor="#0D0D0D";}}>
              <div style={{ width:40,height:30,borderRadius:5,overflow:"hidden",backgroundColor:"#1a1a1a",flexShrink:0 }}>
                {thumb?<img src={thumb} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>:<div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>🏋️</div>}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:10,fontWeight:600,color:"#F5F5F0",margin:"0 0 2px",fontFamily:"system-ui",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ex.nom}</p>
                <span style={{ fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:99,color,backgroundColor:`${color}20`,fontFamily:"system-ui" }}>{ex.groupe_musculaire}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding:"7px 12px",borderTop:"1px solid #1a1a1a",flexShrink:0 }}>
        <p style={{ fontSize:8,color:"#333",margin:0,fontFamily:"system-ui" }}>⠿ Glisse dans un bloc pour ajouter</p>
      </div>
    </div>
  );
}

// ─── Bloc Tabata (garde l'affichage carte) ────────────────────────────────────
function TabataBlocContent({ bloc, onChange }: { bloc: Bloc; onChange: (changes: Partial<Bloc>) => void }) {
  const dragIdx = useRef<number|null>(null);
  const inp: React.CSSProperties = { padding:"5px 8px",borderRadius:6,border:"1px solid #2a2a2a",backgroundColor:"#1a1a1a",color:"#F5F5F0",fontSize:11,fontFamily:"system-ui",outline:"none",width:60,textAlign:"center" };

  function addExercise(ex: Exercise) {
    const item: TabataItem = { _key: newKey(), exercise_id: ex.id, exercise: ex, series: "", tabata_work: bloc.tabata_work, tabata_rest: bloc.tabata_rest, notes: "" };
    onChange({ tabata_exercices: [...bloc.tabata_exercices, item] });
  }
  function changeItem(key: string, field: string, val: string) {
    onChange({ tabata_exercices: bloc.tabata_exercices.map(e=>e._key===key?{...e,[field]:val}:e) });
  }
  function removeItem(key: string) {
    onChange({ tabata_exercices: bloc.tabata_exercices.filter(e=>e._key!==key) });
  }

  return (
    <div>
      {/* Config Tabata */}
      <div style={{ display:"flex",gap:12,alignItems:"center",padding:"10px 12px",backgroundColor:"rgba(249,115,22,0.06)",borderRadius:8,marginBottom:10,border:"1px solid rgba(249,115,22,0.15)",flexWrap:"wrap" }}>
        <p style={{ fontSize:10,color:"#F97316",fontWeight:700,margin:0,fontFamily:"system-ui" }}>🔥 TABATA</p>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <label style={{ fontSize:9,color:"#888",fontFamily:"system-ui" }}>Effort</label>
          <input style={inp} type="number" value={bloc.tabata_work} onChange={e=>onChange({tabata_work:e.target.value})} />
          <label style={{ fontSize:9,color:"#888",fontFamily:"system-ui" }}>s · Repos</label>
          <input style={inp} type="number" value={bloc.tabata_rest} onChange={e=>onChange({tabata_rest:e.target.value})} />
          <label style={{ fontSize:9,color:"#888",fontFamily:"system-ui" }}>s · Tours</label>
          <input style={inp} type="number" value={bloc.tabata_tours} onChange={e=>onChange({tabata_tours:e.target.value})} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();try{addExercise(JSON.parse(e.dataTransfer.getData("exerciseData")));}catch{}}}
        style={{ minHeight:40,borderRadius:6,border:"1px dashed #2a2a2a",marginBottom:6,padding:6 }}
      >
        {bloc.tabata_exercices.length===0&&<p style={{ fontSize:10,color:"#444",margin:0,textAlign:"center",fontFamily:"system-ui",padding:"6px 0" }}>Glisse des exercices ici</p>}
        {bloc.tabata_exercices.map((item,idx)=>{
          const thumb=item.exercise?.miniature_url||ytThumb(item.exercise?.video_url);
          const color=GC[item.exercise?.groupe_musculaire]??"#888";
          const ri: React.CSSProperties = { padding:"4px 6px",borderRadius:5,border:"1px solid #2a2a2a",backgroundColor:"#1a1a1a",color:"#F5F5F0",fontSize:10,fontFamily:"system-ui",outline:"none",width:55,textAlign:"center" };
          return (
            <div key={item._key} draggable
              onDragStart={()=>{dragIdx.current=idx;}}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();if(dragIdx.current!==null&&dragIdx.current!==idx){const n=[...bloc.tabata_exercices];const[it]=n.splice(dragIdx.current,1);n.splice(idx,0,it);onChange({tabata_exercices:n});}dragIdx.current=null;}}
              style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 8px",backgroundColor:"#111",borderRadius:7,marginBottom:4,border:"1px solid #1e1e1e" }}>
              <span style={{ cursor:"grab",color:"#333",fontSize:12 }}>⠿</span>
              <div style={{ width:40,height:30,borderRadius:5,overflow:"hidden",backgroundColor:"#1a1a1a",flexShrink:0 }}>
                {thumb?<img src={thumb} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>:<div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10 }}>🏋️</div>}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:11,fontWeight:700,color:"#F5F5F0",margin:"0 0 2px",fontFamily:"system-ui",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{item.exercise?.nom}</p>
                <span style={{ fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:99,color,backgroundColor:`${color}20`,fontFamily:"system-ui" }}>{item.exercise?.groupe_musculaire}</span>
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center",flexShrink:0 }}>
                {[["series","Séries"],["tabata_work","Effort(s)"],["tabata_rest","Repos(s)"]].map(([fk,fl])=>(
                  <div key={fk}><label style={{ display:"block",fontSize:8,color:"#444",textAlign:"center",fontFamily:"system-ui",marginBottom:2 }}>{fl}</label><input style={ri} type="number" placeholder="—" value={(item as unknown as Record<string,string>)[fk]??""} onChange={e=>changeItem(item._key,fk,e.target.value)} /></div>
                ))}
                <div><label style={{ display:"block",fontSize:8,color:"#444",fontFamily:"system-ui",marginBottom:2 }}>Notes</label><input style={{ ...ri,width:90,textAlign:"left" }} type="text" value={item.notes} onChange={e=>changeItem(item._key,"notes",e.target.value)} /></div>
              </div>
              <button onClick={()=>removeItem(item._key)} style={{ background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:13,padding:"2px" }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bloc Texte + Exercices (tous sauf Tabata) ────────────────────────────────
function RichBlocContent({ bloc, onChange }: { bloc: Bloc; onChange: (changes: Partial<Bloc>) => void }) {
  const [videoEx, setVideoEx] = useState<Exercise|null>(null);
  const dragItemKey = useRef<string|null>(null);

  function addExercise(ex: Exercise) {
    onChange({ rich_exercices: [...bloc.rich_exercices, { _key: newKey(), exercise: ex }] });
  }
  function removeRich(key: string) {
    onChange({ rich_exercices: bloc.rich_exercices.filter(e=>e._key!==key) });
  }
  function moveUp(key: string) {
    const i=bloc.rich_exercices.findIndex(e=>e._key===key);if(i<=0)return;
    const n=[...bloc.rich_exercices];[n[i-1],n[i]]=[n[i],n[i-1]];onChange({rich_exercices:n});
  }
  function moveDown(key: string) {
    const i=bloc.rich_exercices.findIndex(e=>e._key===key);if(i>=bloc.rich_exercices.length-1)return;
    const n=[...bloc.rich_exercices];[n[i],n[i+1]]=[n[i+1],n[i]];onChange({rich_exercices:n});
  }

  return (
    <div>
      {/* Instructions */}
      <textarea
        value={bloc.instructions}
        onChange={e=>onChange({instructions:e.target.value})}
        placeholder="Décris les consignes, la progression, les temps de repos, les techniques…"
        style={{ width:"100%",minHeight:72,padding:"9px 11px",borderRadius:8,border:"1px solid #2a2a2a",backgroundColor:"#161616",color:"#F5F5F0",fontSize:12,fontFamily:"system-ui",outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5,marginBottom:8 }}
      />

      {/* Exercices en texte */}
      <div
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();const src=e.dataTransfer.getData("source");if(src==="bank"){try{addExercise(JSON.parse(e.dataTransfer.getData("exerciseData")));}catch{}}}}
        style={{ minHeight:bloc.rich_exercices.length===0?36:0,border:bloc.rich_exercices.length===0?"1px dashed #2a2a2a":"none",borderRadius:6,padding:bloc.rich_exercices.length===0?"6px":0,marginBottom:bloc.rich_exercices.length>0?4:0 }}
      >
        {bloc.rich_exercices.length===0&&<p style={{ fontSize:10,color:"#444",margin:0,textAlign:"center",fontFamily:"system-ui" }}>Glisse des exercices ici pour les ajouter dans les consignes</p>}
      </div>

      {bloc.rich_exercices.length > 0 && (
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,padding:"4px 0",alignItems:"center" }}>
          {bloc.rich_exercices.map((re,idx)=>{
            const color=GC[re.exercise.groupe_musculaire]??"#B22222";
            const hasVideo=!!re.exercise.video_url;
            return (
              <span key={re._key} draggable
                onDragStart={()=>{dragItemKey.current=re._key;}}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const src=e.dataTransfer.getData("source");if(src==="bank"){try{addExercise(JSON.parse(e.dataTransfer.getData("exerciseData")));}catch{}}else if(dragItemKey.current&&dragItemKey.current!==re._key){const i=bloc.rich_exercices.findIndex(x=>x._key===dragItemKey.current);const j=idx;const n=[...bloc.rich_exercices];const[it]=n.splice(i,1);n.splice(j,0,it);onChange({rich_exercices:n});}dragItemKey.current=null;}}
                style={{ display:"inline-flex",alignItems:"center",gap:5,backgroundColor:"#161616",border:`1px solid ${color}30`,borderRadius:20,padding:"4px 10px 4px 8px",cursor:"grab" }}>
                <span style={{ cursor:"grab",color:"#333",fontSize:10,userSelect:"none" }}>⠿</span>
                <span
                  onClick={()=>hasVideo&&setVideoEx(re.exercise)}
                  style={{ color:"#B22222",fontWeight:800,fontSize:12,fontFamily:"system-ui",cursor:hasVideo?"pointer":"default",textDecoration:hasVideo?"underline":"none" }}
                  title={hasVideo?"Voir la vidéo":undefined}
                >
                  {re.exercise.nom}
                </span>
                {hasVideo && <span style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>▶</span>}
                <button onClick={()=>removeRich(re._key)} style={{ background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:11,padding:"0 0 0 2px",lineHeight:1 }}>✕</button>
                <div style={{ display:"flex",flexDirection:"column",gap:1 }}>
                  <button onClick={()=>moveUp(re._key)} disabled={idx===0} style={{ background:"none",border:"none",cursor:idx===0?"default":"pointer",color:idx===0?"#2a2a2a":"#555",fontSize:7,padding:0,lineHeight:1 }}>▲</button>
                  <button onClick={()=>moveDown(re._key)} disabled={idx===bloc.rich_exercices.length-1} style={{ background:"none",border:"none",cursor:idx===bloc.rich_exercices.length-1?"default":"pointer",color:idx===bloc.rich_exercices.length-1?"#2a2a2a":"#555",fontSize:7,padding:0,lineHeight:1 }}>▼</button>
                </div>
              </span>
            );
          })}
        </div>
      )}

      {videoEx && videoEx.video_url && <VideoModal url={videoEx.video_url} nom={videoEx.nom} onClose={()=>setVideoEx(null)} />}
    </div>
  );
}

// ─── Bloc Card ────────────────────────────────────────────────────────────────
const BICONS: Record<BlocType,string> = { echauffement:"🔥", corps:"💪", finisher:"🏁" };
const BCOLORS: Record<BlocType,string> = { echauffement:"#F97316", corps:"#B22222", finisher:"#8B5CF6" };

function BlocCard({ bloc, corpsIdx, onBlocChange, onBlocRemove, onDrop }:{
  bloc:Bloc; corpsIdx:number;
  onBlocChange:(key:string,b:Partial<Bloc>)=>void;
  onBlocRemove:(key:string)=>void;
  onDrop:(e:React.DragEvent)=>void;
}) {
  const [collapsed,setCollapsed]=useState(false);
  const color=BCOLORS[bloc.type];
  const isTabata=bloc.format==="tabata"&&bloc.type==="corps";
  const intervalSec=(parseInt(bloc.emom_interval_min)||1)*60+(parseInt(bloc.emom_interval_sec)||0);
  const inp: React.CSSProperties = { padding:"5px 8px",borderRadius:6,border:"1px solid #2a2a2a",backgroundColor:"#161616",color:"#F5F5F0",fontSize:11,fontFamily:"system-ui",outline:"none" };

  return (
    <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const src=e.dataTransfer.getData("source");if(src!=="bank")return;onDrop(e);}}
      style={{ backgroundColor:"#111",border:"1px solid #1a1a1a",borderRadius:12,marginBottom:10,overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderBottom:collapsed?"none":"1px solid #1a1a1a",backgroundColor:"#0f0f0f" }}>
        <span style={{ fontSize:16 }}>{BICONS[bloc.type]}</span>
        <div style={{ width:3,height:16,backgroundColor:color,borderRadius:2,flexShrink:0 }} />
        <input value={bloc.nom} onChange={e=>onBlocChange(bloc._key,{nom:e.target.value})}
          style={{ flex:1,background:"none",border:"none",color:"#F5F5F0",fontSize:13,fontWeight:700,fontFamily:"system-ui",outline:"none" }} />
        {bloc.type==="corps" && (
          <select value={bloc.format} onChange={e=>onBlocChange(bloc._key,{format:e.target.value})}
            style={{ ...inp,cursor:"pointer",fontSize:11,color:bloc.format!=="classique"?"#F97316":"#888" }}>
            {FORMATS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        )}
        <span style={{ fontSize:9,color:"#444",fontFamily:"system-ui",whiteSpace:"nowrap" }}>
          {isTabata?`${bloc.tabata_exercices.length} ex.`:`${bloc.rich_exercices.length} ex.`}
        </span>
        {bloc.type==="corps"&&corpsIdx>1&&(
          <button onClick={()=>onBlocRemove(bloc._key)} style={{ background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:13,padding:"2px 4px" }}>✕</button>
        )}
        <button onClick={()=>setCollapsed(c=>!c)} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,padding:"2px 4px" }}>{collapsed?"▼":"▲"}</button>
      </div>

      {!collapsed && (
        <div style={{ padding:"12px 14px" }}>
          {/* EMOM config */}
          {bloc.type==="corps" && bloc.format==="emom" && (
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:8,padding:"8px 10px",backgroundColor:"rgba(59,130,246,0.06)",borderRadius:8,border:"1px solid rgba(59,130,246,0.15)" }}>
                <p style={{ fontSize:10,color:"#60A5FA",fontWeight:700,margin:0,fontFamily:"system-ui" }}>EMOM</p>
                <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                  <label style={{ fontSize:9,color:"#666",fontFamily:"system-ui" }}>Rounds</label>
                  <input style={{ ...inp,width:50 }} type="number" min="1" value={bloc.emom_rounds} onChange={e=>onBlocChange(bloc._key,{emom_rounds:e.target.value})} />
                  <label style={{ fontSize:9,color:"#666",fontFamily:"system-ui" }}>· Intervalle</label>
                  <select style={{ ...inp,cursor:"pointer" }} value={bloc.emom_interval_min} onChange={e=>onBlocChange(bloc._key,{emom_interval_min:e.target.value})}>
                    {Array.from({length:10},(_,i)=><option key={i} value={i}>{i} min</option>)}
                  </select>
                  <select style={{ ...inp,cursor:"pointer" }} value={bloc.emom_interval_sec} onChange={e=>onBlocChange(bloc._key,{emom_interval_sec:e.target.value})}>
                    {[0,5,10,15,20,25,30,35,40,45,50,55].map(s=><option key={s} value={s}>{String(s).padStart(2,"0")} s</option>)}
                  </select>
                </div>
              </div>
              <EmomTimer rounds={parseInt(bloc.emom_rounds)||10} intervalSec={intervalSec} />
            </div>
          )}
          {/* AMRAP config */}
          {bloc.type==="corps" && bloc.format==="amrap" && (
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8,padding:"8px 10px",backgroundColor:"rgba(139,92,246,0.06)",borderRadius:8,border:"1px solid rgba(139,92,246,0.15)" }}>
                <p style={{ fontSize:10,color:"#8B5CF6",fontWeight:700,margin:0,fontFamily:"system-ui" }}>AMRAP</p>
                <input style={{ ...inp,width:55 }} type="number" min="1" value={bloc.amrap_duree} onChange={e=>onBlocChange(bloc._key,{amrap_duree:e.target.value})} />
                <label style={{ fontSize:9,color:"#666",fontFamily:"system-ui" }}>min</label>
              </div>
              <AmrapTimer totalMin={parseInt(bloc.amrap_duree)||10} />
            </div>
          )}
          {/* For Time config */}
          {bloc.type==="corps" && bloc.format==="for_time" && (
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8,padding:"8px 10px",backgroundColor:"rgba(16,185,129,0.06)",borderRadius:8,border:"1px solid rgba(16,185,129,0.15)" }}>
                <p style={{ fontSize:10,color:"#10B981",fontWeight:700,margin:0,fontFamily:"system-ui" }}>FOR TIME</p>
                <label style={{ fontSize:9,color:"#666",fontFamily:"system-ui" }}>Limite</label>
                <input style={{ ...inp,width:55 }} type="number" min="0" value={bloc.for_time_limit} onChange={e=>onBlocChange(bloc._key,{for_time_limit:e.target.value})} />
                <label style={{ fontSize:9,color:"#666",fontFamily:"system-ui" }}>min (0 = aucune)</label>
              </div>
              <ForTimeTimer limitMin={parseInt(bloc.for_time_limit)||0} />
            </div>
          )}
          {/* Durée estimée du bloc */}
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
            <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>⏱ Durée estimée</label>
            <input style={{ ...inp,width:50,textAlign:"center" }} type="number" min="1" value={bloc.amrap_duree&&bloc.format==="amrap"?bloc.amrap_duree:""} placeholder="min" onChange={()=>{}} readOnly={bloc.format==="amrap"} />
            <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>min</label>
          </div>

          {/* Contenu exercices */}
          {isTabata ? (
            <TabataBlocContent bloc={bloc} onChange={c=>onBlocChange(bloc._key,c)} />
          ) : (
            <RichBlocContent bloc={bloc} onChange={c=>onBlocChange(bloc._key,c)} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Builder principal ────────────────────────────────────────────────────────
export interface SeanceBuilderProps {
  data: SeanceData;
  onChange: (data: SeanceData) => void;
}

export default function SeanceBuilder({ data, onChange }: SeanceBuilderProps) {
  const [bankDragging, setBankDragging] = useState(false);

  const updateBloc = useCallback((key:string, changes:Partial<Bloc>)=>{
    onChange({ ...data, blocs: data.blocs.map(b=>b._key===key?{...b,...changes}:b) });
  },[data,onChange]);

  const removeBloc = useCallback((key:string)=>{
    onChange({ ...data, blocs: data.blocs.filter(b=>b._key!==key) });
  },[data,onChange]);

  const addCorpsBloc = useCallback(()=>{
    const n = data.blocs.filter(b=>b.type==="corps").length + 1;
    const newBloc = defaultBloc("corps", n);
    const finIdx = data.blocs.findIndex(b=>b.type==="finisher");
    const blocs = [...data.blocs];
    if(finIdx>=0) blocs.splice(finIdx,0,newBloc); else blocs.push(newBloc);
    onChange({ ...data, blocs });
  },[data,onChange]);

  const toggleFinisher = useCallback(()=>{
    const has = data.blocs.some(b=>b.type==="finisher");
    if(has) onChange({ ...data, blocs: data.blocs.filter(b=>b.type!=="finisher") });
    else onChange({ ...data, blocs: [...data.blocs, defaultBloc("finisher")] });
  },[data,onChange]);

  function handleDropOnBloc(e: React.DragEvent, blocKey: string) {
    setBankDragging(false);
    try {
      const ex = JSON.parse(e.dataTransfer.getData("exerciseData")) as Exercise;
      const bloc = data.blocs.find(b=>b._key===blocKey);
      if (!bloc) return;
      if (bloc.format==="tabata" && bloc.type==="corps") {
        const item: TabataItem = { _key: newKey(), exercise_id: ex.id, exercise: ex, series: "", tabata_work: bloc.tabata_work, tabata_rest: bloc.tabata_rest, notes: "" };
        updateBloc(blocKey, { tabata_exercices: [...bloc.tabata_exercices, item] });
      } else {
        updateBloc(blocKey, { rich_exercices: [...bloc.rich_exercices, { _key: newKey(), exercise: ex }] });
      }
    } catch {}
  }

  const hasFinisher = data.blocs.some(b=>b.type==="finisher");

  return (
    <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", minHeight:600, border:"1px solid #1a1a1a", borderRadius:12, overflow:"hidden" }}
      onDragStart={()=>setBankDragging(true)}
      onDragEnd={()=>setBankDragging(false)}>
      <ExerciseBank onDragStart={()=>setBankDragging(true)} />
      <div style={{ backgroundColor:"#0a0a0a",padding:"14px",overflowY:"auto" }}>
        {data.blocs.map((bloc,idx)=>{
          const corpsIdx = data.blocs.filter((b,i)=>b.type==="corps"&&i<=idx).length;
          return (
            <BlocCard key={bloc._key} bloc={bloc} corpsIdx={corpsIdx}
              onBlocChange={updateBloc} onBlocRemove={removeBloc}
              onDrop={e=>handleDropOnBloc(e,bloc._key)}
            />
          );
        })}
        <div style={{ display:"flex",gap:8,marginTop:8 }}>
          <button onClick={addCorpsBloc} style={{ flex:1,padding:"9px",borderRadius:8,border:"1px dashed #2a2a2a",backgroundColor:"transparent",color:"#666",fontSize:12,cursor:"pointer",fontFamily:"system-ui" }}>➕ Ajouter un bloc Corps</button>
          <button onClick={toggleFinisher} style={{ padding:"9px 14px",borderRadius:8,border:`1px dashed ${hasFinisher?"#8B5CF6":"#2a2a2a"}`,backgroundColor:hasFinisher?"rgba(139,92,246,0.08)":"transparent",color:hasFinisher?"#8B5CF6":"#666",fontSize:12,cursor:"pointer",fontFamily:"system-ui" }}>{hasFinisher?"🏁 Retirer finisher":"🏁 Ajouter finisher"}</button>
        </div>
      </div>
    </div>
  );
}
