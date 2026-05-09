"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string; nom: string; groupe_musculaire: string; materiel: string;
  video_url: string | null; miniature_url: string | null;
}
export interface SeanceItem {
  _key: string; exercise_id: string; exercise: Exercise;
  series: string; repetitions: string; duree_secondes: string; temps_repos: string;
  tabata_work: string; tabata_rest: string; emom_duree: string; notes: string;
}
export type BlocType = "echauffement" | "corps" | "finisher";
export interface Bloc {
  _key: string; type: BlocType; nom: string; format: string;
  tabata_work: string; tabata_rest: string;
  emom_total: string; emom_interval_min: string; emom_interval_sec: string;
  duree_estimee: string;
  exercices: SeanceItem[];
}
export interface SeanceData {
  nom: string; note: string; blocs: Bloc[];
}

// ─── Const ───────────────────────────────────────────────────────────────────
export const FORMATS = [
  { value: "classique", label: "Classique" },
  { value: "tabata",    label: "Tabata" },
  { value: "emom",      label: "EMOM" },
  { value: "amrap",     label: "AMRAP" },
  { value: "for_time",  label: "For Time" },
];
const GROUPES = ["Quadriceps","Ischiojambier","Fessier","Abducteur","Adducteur",
  "Abdominaux","Biceps","Triceps","Pec","Dos","Lombaire","Épaule","Coeur"];
const GROUPE_COLORS: Record<string,string> = {
  "Quadriceps":"#3B82F6","Ischiojambier":"#8B5CF6","Fessier":"#EC4899",
  "Abducteur":"#F59E0B","Adducteur":"#F97316","Abdominaux":"#EF4444",
  "Biceps":"#10B981","Triceps":"#06B6D4","Pec":"#F97316",
  "Dos":"#8B5CF6","Lombaire":"#84CC16","Épaule":"#B22222","Coeur":"#EF4444",
};
let _k = 0;
export function newKey() { return `k${++_k}_${Date.now()}`; }
function ytThumb(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}
export function defaultBloc(type: BlocType, index = 1): Bloc {
  return {
    _key: newKey(), type,
    nom: type === "echauffement" ? "Échauffement" : type === "finisher" ? "Finisher" : `Bloc ${index}`,
    format: "classique",
    tabata_work: "20", tabata_rest: "10",
    emom_total: "10", emom_interval_min: "1", emom_interval_sec: "0",
    duree_estimee: "20", exercices: [],
  };
}
export function defaultItem(ex: Exercise): SeanceItem {
  return { _key: newKey(), exercise_id: ex.id, exercise: ex,
    series: "", repetitions: "", duree_secondes: "", temps_repos: "60",
    tabata_work: "20", tabata_rest: "10", emom_duree: "40", notes: "" };
}

// ─── Sérialisation DB ─────────────────────────────────────────────────────────
export function encodeSeance(data: SeanceData): { description: string; flat_exercices: object[] } {
  const blocs_meta = data.blocs.map(b => ({
    key: b._key, type: b.type, nom: b.nom, format: b.format,
    tw: parseInt(b.tabata_work)||20, tr: parseInt(b.tabata_rest)||10,
    et: parseInt(b.emom_total)||10,eim: parseInt(b.emom_interval_min)||1,
    eis: parseInt(b.emom_interval_sec)||0, de: parseInt(b.duree_estimee)||0,
  }));
  const description = JSON.stringify({ blocs: blocs_meta, note: data.note });
  const flat_exercices = data.blocs.flatMap((bloc, bi) =>
    bloc.exercices.map((ex, ei) => ({
      exercise_id: ex.exercise_id,
      ordre: bi * 10000 + ei,
      series: ex.series ? parseInt(ex.series) : null,
      repetitions: ex.repetitions ? parseInt(ex.repetitions) : null,
      duree_secondes: (ex.duree_secondes || ex.emom_duree) ? parseInt(ex.duree_secondes || ex.emom_duree) : null,
      temps_repos: (ex.tabata_rest || ex.temps_repos) ? parseInt(ex.tabata_rest || ex.temps_repos) : 60,
      notes: ex.notes || null,
    }))
  );
  return { description, flat_exercices };
}
export function decodeSeance(seance: Record<string,unknown>, exercices: Record<string,unknown>[]): SeanceData {
  let blocs_meta: { key: string; type: BlocType; nom: string; format: string; tw:number; tr:number; et:number; eim:number; eis:number; de:number }[] = [];
  let note = "";
  try {
    const d = seance.description as string || "";
    if (d.startsWith("{")) { const p = JSON.parse(d); blocs_meta = p.blocs ?? []; note = p.note ?? ""; }
    else note = d;
  } catch { note = (seance.description as string) || ""; }

  if (!blocs_meta.length) {
    blocs_meta = [{ key: newKey(), type: "echauffement", nom: "Échauffement", format: "classique", tw:20,tr:10,et:10,eim:1,eis:0,de:0 },
                  { key: newKey(), type: "corps",        nom: "Bloc 1",        format: "classique", tw:20,tr:10,et:10,eim:1,eis:0,de:0 }];
  }

  const by_bloc: Record<number, SeanceItem[]> = {};
  for (const ex of exercices) {
    const ordre = (ex.ordre as number) ?? 0;
    const bi = Math.floor(ordre / 10000);
    const ei = ordre % 10000;
    if (!by_bloc[bi]) by_bloc[bi] = [];
    const exercise = ex.exercise as Exercise;
    by_bloc[bi][ei] = {
      _key: newKey(), exercise_id: exercise?.id ?? (ex.exercise_id as string),
      exercise,
      series: (ex.series as number|null)?.toString() ?? "",
      repetitions: (ex.repetitions as number|null)?.toString() ?? "",
      duree_secondes: (ex.duree_secondes as number|null)?.toString() ?? "",
      temps_repos: (ex.temps_repos as number)?.toString() ?? "60",
      tabata_work: (ex.duree_secondes as number|null)?.toString() ?? "20",
      tabata_rest: (ex.temps_repos as number)?.toString() ?? "10",
      emom_duree: (ex.duree_secondes as number|null)?.toString() ?? "40",
      notes: (ex.notes as string|null) ?? "",
    };
  }

  const blocs: Bloc[] = blocs_meta.map((bm, bi) => ({
    _key: bm.key, type: bm.type, nom: bm.nom, format: bm.format,
    tabata_work: bm.tw.toString(), tabata_rest: bm.tr.toString(),
    emom_total: bm.et.toString(), emom_interval_min: bm.eim.toString(),
    emom_interval_sec: bm.eis.toString(), duree_estimee: bm.de.toString(),
    exercices: (by_bloc[bi] ?? []).filter(Boolean),
  }));

  return { nom: (seance.nom as string) || "", note, blocs };
}

// ─── Timers ───────────────────────────────────────────────────────────────────
function useTimer(up = false) {
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setT(v => up ? v+1 : Math.max(0,v-1)), 1000);
    return () => clearTimeout(id);
  }, [running, t, up]);
  return { running, t, setT, toggle: () => setRunning(r=>!r), reset: (v=0) => { setRunning(false); setT(v); } };
}

function Chrono({ total, up }: { total: number; up?: boolean }) {
  const { running, t, toggle, reset } = useTimer(up);
  const display = up ? t : Math.max(0, total - t);
  const m = Math.floor(display/60); const s = display%60;
  const pct = up ? (t/Math.max(1,total))*100 : ((total-display)/Math.max(1,total))*100;
  const alert = !up && display <= 30 && running;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, backgroundColor:"#161616", borderRadius:8, padding:"10px 14px" }}>
      <p style={{ fontSize:28, fontWeight:800, color:alert?"#EF4444":"#F5F5F0", margin:0, fontFamily:"system-ui", minWidth:72 }}>
        {String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </p>
      <div style={{ flex:1, height:4, backgroundColor:"#222", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, backgroundColor:alert?"#EF4444":up?"#10B981":"#B22222", transition:"width 1s linear", borderRadius:99 }} />
      </div>
      <button onClick={toggle} style={{ padding:"5px 12px", borderRadius:6, border:"none", backgroundColor:running?"#333":up?"#10B981":"#B22222", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"system-ui" }}>{running?"⏸":"▶"}</button>
      <button onClick={() => reset(up?0:total)} style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #222", backgroundColor:"transparent", color:"#666", fontSize:11, cursor:"pointer", fontFamily:"system-ui" }}>↺</button>
    </div>
  );
}

function EmomChrono({ total, intervalSec }: { total: number; intervalSec: number }) {
  const { running, t, toggle, reset } = useTimer(true);
  const inter = Math.max(1, intervalSec);
  const secInInter = t % inter;
  const remaining = inter - secInInter;
  const rm = Math.floor(remaining/60); const rs = remaining%60;
  const round = Math.floor(t/inter)+1;
  const totalRounds = Math.ceil((total*60)/inter);
  return (
    <div style={{ backgroundColor:"#161616", borderRadius:8, padding:"10px 14px" }}>
      <p style={{ fontSize:9, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 6px", fontFamily:"system-ui" }}>EMOM — Round {Math.min(round,totalRounds)}/{totalRounds}</p>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <p style={{ fontSize:28, fontWeight:800, color:remaining<=10?"#EF4444":"#60A5FA", margin:0, fontFamily:"system-ui", minWidth:60 }}>
          {rm>0?`${rm}:`:""}:{String(rs).padStart(2,"0")}
        </p>
        <div style={{ flex:1, height:4, backgroundColor:"#222", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(t/(total*60))*100}%`, backgroundColor:"#3B82F6", transition:"width 1s linear", borderRadius:99 }} />
        </div>
        <button onClick={toggle} style={{ padding:"5px 12px", borderRadius:6, border:"none", backgroundColor:running?"#333":"#3B82F6", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"system-ui" }}>{running?"⏸":"▶"}</button>
        <button onClick={() => reset(0)} style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #222", backgroundColor:"transparent", color:"#666", fontSize:11, cursor:"pointer", fontFamily:"system-ui" }}>↺</button>
      </div>
    </div>
  );
}

// ─── Ligne exercice dans un bloc ──────────────────────────────────────────────
function ExRow({ item, index, total, format, onChange, onRemove, onUp, onDown, dragging, onDragStart, onDragOver, onDrop }:{
  item:SeanceItem; index:number; total:number; format:string;
  onChange:(key:string,field:string,val:string)=>void; onRemove:(key:string)=>void;
  onUp:(key:string)=>void; onDown:(key:string)=>void;
  dragging:boolean; dragOver:boolean; onDragStart:()=>void; onDragOver:()=>void; onDrop:()=>void;
}) {
  const thumb = item.exercise?.miniature_url || ytThumb(item.exercise?.video_url);
  const color = GROUPE_COLORS[item.exercise?.groupe_musculaire] ?? "#888";
  const inp: React.CSSProperties = { width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #2a2a2a", fontSize:11, fontFamily:"system-ui", outline:"none", backgroundColor:"#1a1a1a", color:"#F5F5F0", textAlign:"center" };
  const fields = format==="tabata" ? [["tabata_work","Effort(s)"],["tabata_rest","Repos(s)"]] :
                 format==="emom"   ? [["emom_duree","Durée(s)"]] :
                 (format==="amrap"||format==="for_time") ? [] :
                 [["series","Séries"],["repetitions","Rép."],["duree_secondes","Durée(s)"],["temps_repos","Repos(s)"]];
  return (
    <div draggable onDragStart={()=>onDragStart()} onDragOver={e=>{e.preventDefault();onDragOver();}} onDrop={e=>{e.preventDefault();onDrop();}}
      style={{ backgroundColor:dragging?"#1a2a1a":"#111", border:`1px solid ${dragging?"#4ADE80":"#1e1e1e"}`, borderRadius:8, marginBottom:5, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", borderBottom:"1px solid #1a1a1a" }}>
        <span style={{ cursor:"grab", color:"#333", fontSize:14, userSelect:"none" }}>⠿</span>
        <span style={{ width:18,height:18,borderRadius:"50%",backgroundColor:"#B22222",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"system-ui" }}>{index+1}</span>
        <div style={{ width:44,height:32,borderRadius:5,overflow:"hidden",backgroundColor:"#1a1a1a",flexShrink:0 }}>
          {thumb?<img src={thumb} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>:<div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>🏋️</div>}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontSize:11,fontWeight:700,color:"#F5F5F0",margin:"0 0 2px",fontFamily:"system-ui",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{item.exercise?.nom}</p>
          <span style={{ fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:99,color,backgroundColor:`${color}20`,fontFamily:"system-ui" }}>{item.exercise?.groupe_musculaire}</span>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:1 }}>
          <button onClick={()=>onUp(item._key)} disabled={index===0} style={{ background:"none",border:"none",cursor:index===0?"default":"pointer",color:index===0?"#2a2a2a":"#555",fontSize:8,padding:"1px 3px" }}>▲</button>
          <button onClick={()=>onDown(item._key)} disabled={index===total-1} style={{ background:"none",border:"none",cursor:index===total-1?"default":"pointer",color:index===total-1?"#2a2a2a":"#555",fontSize:8,padding:"1px 3px" }}>▼</button>
        </div>
        <button onClick={()=>onRemove(item._key)} style={{ background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:13,padding:"2px 4px" }}>✕</button>
      </div>
      {(fields.length>0||true) && (
        <div style={{ padding:"7px 10px", display:"grid", gridTemplateColumns:`${fields.map(()=>"1fr").join(" ")} 2fr`, gap:6 }}>
          {fields.map(([fk,fl])=>(
            <div key={fk}>
              <label style={{ display:"block",fontSize:8,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2,fontFamily:"system-ui" }}>{fl}</label>
              <input style={inp} type="number" min="0" placeholder="—" value={(item as unknown as Record<string,string>)[fk]??""} onChange={e=>onChange(item._key,fk,e.target.value)} />
            </div>
          ))}
          <div>
            <label style={{ display:"block",fontSize:8,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2,fontFamily:"system-ui" }}>Notes</label>
            <input style={{ ...inp,textAlign:"left" }} type="text" placeholder="Instructions…" value={item.notes} onChange={e=>onChange(item._key,"notes",e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloc card ────────────────────────────────────────────────────────────────
const BLOC_ICONS: Record<BlocType,string> = { echauffement:"🔥", corps:"💪", finisher:"🏁" };
const BLOC_COLORS: Record<BlocType,string> = { echauffement:"#F97316", corps:"#B22222", finisher:"#8B5CF6" };

function BlocCard({ bloc, index, onBlocChange, onBlocRemove, dragOver, onDragOver, onDrop, bankDragActive }:{
  bloc:Bloc; index:number;
  onBlocChange:(key:string,b:Partial<Bloc>)=>void;
  onBlocRemove:(key:string)=>void;
  dragOver:boolean; onDragOver:(e:React.DragEvent)=>void; onDrop:(e:React.DragEvent)=>void;
  bankDragActive:boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const dragIdx = useRef<number|null>(null);
  const [dragRowOver, setDragRowOver] = useState<number|null>(null);
  const color = BLOC_COLORS[bloc.type];
  const intervalSec = (parseInt(bloc.emom_interval_min)||1)*60 + (parseInt(bloc.emom_interval_sec)||0);

  function changeItem(key:string, field:string, val:string) {
    onBlocChange(bloc._key, { exercices: bloc.exercices.map(e=>e._key===key?{...e,[field]:val}:e) });
  }
  function removeItem(key:string) {
    onBlocChange(bloc._key, { exercices: bloc.exercices.filter(e=>e._key!==key) });
  }
  function moveUp(key:string) {
    const i=bloc.exercices.findIndex(e=>e._key===key); if(i<=0)return;
    const n=[...bloc.exercices]; [n[i-1],n[i]]=[n[i],n[i-1]];
    onBlocChange(bloc._key,{exercices:n});
  }
  function moveDown(key:string) {
    const i=bloc.exercices.findIndex(e=>e._key===key); if(i>=bloc.exercices.length-1)return;
    const n=[...bloc.exercices]; [n[i],n[i+1]]=[n[i+1],n[i]];
    onBlocChange(bloc._key,{exercices:n});
  }

  const inp: React.CSSProperties = { padding:"5px 8px", borderRadius:6, border:"1px solid #2a2a2a", backgroundColor:"#161616", color:"#F5F5F0", fontSize:11, fontFamily:"system-ui", outline:"none" };

  return (
    <div
      onDragOver={e=>{e.preventDefault();onDragOver(e);}}
      onDrop={e=>{e.preventDefault();onDrop(e);}}
      style={{ backgroundColor:"#111", border:`1px solid ${dragOver&&bankDragActive?"#B22222":"#1a1a1a"}`, borderRadius:12, marginBottom:10, overflow:"hidden", transition:"border-color 0.15s" }}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderBottom:collapsed?"none":"1px solid #1a1a1a", backgroundColor:"#0f0f0f" }}>
        <span style={{ fontSize:16 }}>{BLOC_ICONS[bloc.type]}</span>
        <div style={{ width:3, height:18, backgroundColor:color, borderRadius:2, flexShrink:0 }} />
        <input
          value={bloc.nom}
          onChange={e=>onBlocChange(bloc._key,{nom:e.target.value})}
          style={{ flex:1, background:"none", border:"none", color:"#F5F5F0", fontSize:13, fontWeight:700, fontFamily:"system-ui", outline:"none", cursor:"text" }}
        />
        {bloc.type==="corps" && (
          <select value={bloc.format} onChange={e=>onBlocChange(bloc._key,{format:e.target.value})}
            style={{ ...inp, cursor:"pointer", fontSize:11, color: bloc.format!=="classique"?"#F97316":"#888" }}>
            {FORMATS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        )}
        <span style={{ fontSize:10, color:"#444", fontFamily:"system-ui" }}>{bloc.exercices.length} ex.</span>
        {bloc.type==="corps" && index>0 && (
          <button onClick={()=>onBlocRemove(bloc._key)} style={{ background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:13,padding:"2px 4px" }}>✕</button>
        )}
        <button onClick={()=>setCollapsed(c=>!c)} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13,padding:"2px 4px" }}>
          {collapsed?"▼":"▲"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding:"12px 14px" }}>
          {/* Format config (corps only) */}
          {bloc.type==="corps" && bloc.format!=="classique" && (
            <div style={{ marginBottom:10, padding:"10px 12px", backgroundColor:"#161616", borderRadius:8, border:"1px solid #222" }}>
              {bloc.format==="tabata" && (
                <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                  <p style={{ fontSize:10,color:"#F97316",fontWeight:700,margin:0,fontFamily:"system-ui" }}>TABATA defaults</p>
                  <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                    <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>Effort</label>
                    <input style={{ ...inp,width:50 }} type="number" value={bloc.tabata_work} onChange={e=>onBlocChange(bloc._key,{tabata_work:e.target.value})} />
                    <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>s · Repos</label>
                    <input style={{ ...inp,width:50 }} type="number" value={bloc.tabata_rest} onChange={e=>onBlocChange(bloc._key,{tabata_rest:e.target.value})} />
                    <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>s</label>
                  </div>
                </div>
              )}
              {bloc.format==="emom" && (
                <div>
                  <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:8 }}>
                    <p style={{ fontSize:10,color:"#60A5FA",fontWeight:700,margin:0,fontFamily:"system-ui" }}>EMOM</p>
                    <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                      <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>Durée</label>
                      <input style={{ ...inp,width:45 }} type="number" value={bloc.emom_total} onChange={e=>onBlocChange(bloc._key,{emom_total:e.target.value})} />
                      <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>min · Intervalle</label>
                      <input style={{ ...inp,width:40 }} type="number" value={bloc.emom_interval_min} onChange={e=>onBlocChange(bloc._key,{emom_interval_min:e.target.value})} />
                      <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>min</label>
                      <input style={{ ...inp,width:40 }} type="number" value={bloc.emom_interval_sec} onChange={e=>onBlocChange(bloc._key,{emom_interval_sec:e.target.value})} />
                      <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>sec</label>
                    </div>
                  </div>
                  <EmomChrono total={parseInt(bloc.emom_total)||10} intervalSec={intervalSec} />
                </div>
              )}
              {bloc.format==="amrap" && (
                <div>
                  <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8 }}>
                    <p style={{ fontSize:10,color:"#8B5CF6",fontWeight:700,margin:0,fontFamily:"system-ui" }}>AMRAP</p>
                    <input style={{ ...inp,width:50 }} type="number" value={bloc.duree_estimee} onChange={e=>onBlocChange(bloc._key,{duree_estimee:e.target.value})} />
                    <label style={{ fontSize:9,color:"#555",fontFamily:"system-ui" }}>min</label>
                  </div>
                  <Chrono total={(parseInt(bloc.duree_estimee)||10)*60} />
                </div>
              )}
              {bloc.format==="for_time" && (
                <div>
                  <p style={{ fontSize:10,color:"#10B981",fontWeight:700,margin:"0 0 8px",fontFamily:"system-ui" }}>FOR TIME</p>
                  <Chrono total={0} up={true} />
                </div>
              )}
            </div>
          )}

          {/* Drop zone ou liste exercices */}
          {bloc.exercices.length===0 ? (
            <div style={{ border:"2px dashed #2a2a2a", borderRadius:8, padding:"24px", textAlign:"center", backgroundColor: dragOver&&bankDragActive?"rgba(178,34,34,0.05)":"transparent", borderColor:dragOver&&bankDragActive?"#B22222":"#2a2a2a" }}>
              <p style={{ fontSize:11,color:dragOver&&bankDragActive?"#B22222":"#444",margin:0,fontFamily:"system-ui" }}>
                {dragOver&&bankDragActive?"Lâche ici 💪":"Glisse des exercices ici ou clique + dans la banque"}
              </p>
            </div>
          ) : (
            <div>
              {bloc.exercices.map((item,idx)=>(
                <ExRow key={item._key} item={item} index={idx} total={bloc.exercices.length}
                  format={bloc.type==="corps"?bloc.format:"classique"}
                  onChange={changeItem} onRemove={removeItem} onUp={moveUp} onDown={moveDown}
                  dragging={dragIdx.current===idx} dragOver={dragRowOver===idx}
                  onDragStart={()=>{dragIdx.current=idx;}}
                  onDragOver={()=>setDragRowOver(idx)}
                  onDrop={()=>{
                    if(dragIdx.current!==null&&dragIdx.current!==idx){
                      const n=[...bloc.exercices];const[it]=n.splice(dragIdx.current,1);n.splice(idx,0,it);
                      onBlocChange(bloc._key,{exercices:n});
                    }
                    dragIdx.current=null;setDragRowOver(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Banque d'exercices ───────────────────────────────────────────────────────
function ExerciseBank({ onAdd }:{ onAdd:(ex:Exercise,blocKey:string)=>void }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("tous");
  const [targetBloc, setTargetBloc] = useState("");

  useEffect(()=>{
    fetch("/api/coach/exercices").then(r=>r.json()).then(d=>setExercises(d.exercises??[]));
  },[]);

  const filtered = exercises.filter(ex=>{
    if(filterGroupe!=="tous"&&ex.groupe_musculaire!==filterGroupe)return false;
    if(search&&!ex.nom.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",backgroundColor:"#0D0D0D",borderRight:"1px solid #1a1a1a" }}>
      <div style={{ padding:"12px 14px",borderBottom:"1px solid #1a1a1a",flexShrink:0 }}>
        <p style={{ fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 8px",fontFamily:"system-ui" }}>Banque d&apos;exercices</p>
        <input type="search" placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%",padding:"6px 9px",borderRadius:6,border:"1px solid #1e1e1e",backgroundColor:"#161616",color:"#F5F5F0",fontSize:11,fontFamily:"system-ui",outline:"none",boxSizing:"border-box",marginBottom:5 }} />
        <select value={filterGroupe} onChange={e=>setFilterGroupe(e.target.value)}
          style={{ width:"100%",padding:"5px 7px",borderRadius:6,border:"1px solid #1e1e1e",backgroundColor:"#161616",color:"#F5F5F0",fontSize:10,fontFamily:"system-ui",outline:"none",cursor:"pointer",boxSizing:"border-box" }}>
          <option value="tous">Tous les groupes</option>
          {GROUPES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ flex:1,overflowY:"auto" }}>
        {filtered.map(ex=>{
          const thumb=ex.miniature_url||ytThumb(ex.video_url);
          const color=GROUPE_COLORS[ex.groupe_musculaire]??"#888";
          return (
            <div key={ex.id} draggable
              onDragStart={e=>{ e.dataTransfer.setData("source","bank"); e.dataTransfer.setData("exerciseData",JSON.stringify(ex)); }}
              style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid #111",cursor:"grab",backgroundColor:"#0D0D0D",transition:"background 0.1s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.backgroundColor="#111";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.backgroundColor="#0D0D0D";}}
            >
              <div style={{ width:40,height:30,borderRadius:5,overflow:"hidden",backgroundColor:"#1a1a1a",flexShrink:0 }}>
                {thumb?<img src={thumb} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>:<div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>🏋️</div>}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:10,fontWeight:600,color:"#F5F5F0",margin:"0 0 2px",fontFamily:"system-ui",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ex.nom}</p>
                <span style={{ fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:99,color,backgroundColor:`${color}20`,fontFamily:"system-ui" }}>{ex.groupe_musculaire}</span>
              </div>
              {targetBloc && (
                <button onClick={()=>onAdd(ex,targetBloc)} style={{ background:"none",border:"none",color:"#B22222",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0 }}>+</button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding:"8px 12px",borderTop:"1px solid #1a1a1a",flexShrink:0 }}>
        <p style={{ fontSize:8,color:"#333",margin:0,fontFamily:"system-ui" }}>⠿ Glisse dans un bloc · Sélectionne un bloc pour activer +</p>
      </div>
    </div>
  );
}

// ─── SeanceBuilder principal ──────────────────────────────────────────────────
export interface SeanceBuilderProps {
  data: SeanceData;
  onChange: (data: SeanceData) => void;
}

export default function SeanceBuilder({ data, onChange }: SeanceBuilderProps) {
  const [dragOverBloc, setDragOverBloc] = useState<string|null>(null);
  const [bankDragActive, setBankDragActive] = useState(false);
  const [activeBloc, setActiveBloc] = useState<string>("");

  const updateBloc = useCallback((key:string, changes:Partial<Bloc>)=>{
    onChange({ ...data, blocs: data.blocs.map(b=>b._key===key?{...b,...changes}:b) });
  },[data,onChange]);

  const removeBloc = useCallback((key:string)=>{
    onChange({ ...data, blocs: data.blocs.filter(b=>b._key!==key) });
  },[data,onChange]);

  const addCorpsBloc = useCallback(()=>{
    const corpsCount = data.blocs.filter(b=>b.type==="corps").length;
    const finisherIdx = data.blocs.findIndex(b=>b.type==="finisher");
    const newBloc = defaultBloc("corps", corpsCount+1);
    const blocs = [...data.blocs];
    if(finisherIdx>=0) blocs.splice(finisherIdx,0,newBloc);
    else blocs.push(newBloc);
    onChange({ ...data, blocs });
  },[data,onChange]);

  const toggleFinisher = useCallback(()=>{
    const hasFinisher = data.blocs.some(b=>b.type==="finisher");
    if(hasFinisher) onChange({ ...data, blocs: data.blocs.filter(b=>b.type!=="finisher") });
    else onChange({ ...data, blocs: [...data.blocs, defaultBloc("finisher")] });
  },[data,onChange]);

  function addExercise(ex:Exercise, blocKey:string) {
    updateBloc(blocKey, { exercices: [...(data.blocs.find(b=>b._key===blocKey)?.exercices??[]), defaultItem(ex)] });
  }

  function handleDropOnBloc(e:React.DragEvent, blocKey:string) {
    setDragOverBloc(null); setBankDragActive(false);
    if(e.dataTransfer.getData("source")==="bank") {
      try { addExercise(JSON.parse(e.dataTransfer.getData("exerciseData")), blocKey); } catch {}
    }
  }

  const hasFinisher = data.blocs.some(b=>b.type==="finisher");

  return (
    <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", minHeight:600, border:"1px solid #1a1a1a", borderRadius:12, overflow:"hidden" }}
      onDragStart={()=>setBankDragActive(true)}
      onDragEnd={()=>{setBankDragActive(false);setDragOverBloc(null);}}
    >
      {/* Banque */}
      <ExerciseBank onAdd={addExercise} />

      {/* Séance */}
      <div style={{ backgroundColor:"#0a0a0a", padding:"14px", overflowY:"auto" }}>
        {data.blocs.map((bloc,idx)=>{
          const corpsIdx = data.blocs.filter((b,i)=>b.type==="corps"&&i<=idx).length;
          return (
            <BlocCard key={bloc._key} bloc={bloc} index={corpsIdx}
              onBlocChange={updateBloc} onBlocRemove={removeBloc}
              dragOver={dragOverBloc===bloc._key}
              bankDragActive={bankDragActive}
              onDragOver={e=>{e.preventDefault();setDragOverBloc(bloc._key);}}
              onDrop={e=>handleDropOnBloc(e,bloc._key)}
            />
          );
        })}

        {/* Actions */}
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <button onClick={addCorpsBloc} style={{ flex:1, padding:"9px", borderRadius:8, border:"1px dashed #2a2a2a", backgroundColor:"transparent", color:"#666", fontSize:12, cursor:"pointer", fontFamily:"system-ui" }}>
            ➕ Ajouter un bloc Corps
          </button>
          <button onClick={toggleFinisher} style={{ padding:"9px 14px", borderRadius:8, border:`1px dashed ${hasFinisher?"#8B5CF6":"#2a2a2a"}`, backgroundColor:hasFinisher?"rgba(139,92,246,0.08)":"transparent", color:hasFinisher?"#8B5CF6":"#666", fontSize:12, cursor:"pointer", fontFamily:"system-ui" }}>
            {hasFinisher?"🏁 Supprimer finisher":"🏁 Ajouter finisher"}
          </button>
        </div>
      </div>
    </div>
  );
}
