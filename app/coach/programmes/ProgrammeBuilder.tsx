"use client";

import { useState, useEffect, useCallback } from "react";
import { NIVEAUX } from "../seances/SeanceBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeanceRef {
  id: string; nom: string; categorie: string; niveau: string;
  duree_estimee: number | null;
}

export type CellItem =
  | { _key: string; type: "seance";       seanceId: string; seanceName: string; duree: number | null }
  | { _key: string; type: "seance_rapide"; nom: string; notes: string }
  | { _key: string; type: "video";         titre: string; url: string; categorie: string; thumb: string | null };

export type Grid = Record<string, CellItem[]>;  // key = "S{sem}_J{jour}"

export interface ProgrammeData {
  nom: string; niveau: string; duree_mois: number; note: string; grid: Grid;
}

// ─── Const ───────────────────────────────────────────────────────────────────
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const VIDEO_CATS = ["Échauffement", "Cardio", "Étirements", "Mobilité", "Coaching", "Nutrition", "Mental", "Autre"];

export function gridKey(s: number, j: number) { return `S${s}_J${j}`; }
let _k = 0;
function nk() { return `ci${++_k}_${Date.now()}`; }

function ytThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}
function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : null;
}

function nivLabel(v: string) { return NIVEAUX.find(n => n.value === v)?.label ?? v; }

export function encodeProgData(d: ProgrammeData): string {
  return JSON.stringify({ grid: d.grid, note: d.note, duree_mois: d.duree_mois });
}
export function decodeProgData(prog: Record<string, unknown>): ProgrammeData {
  let grid: Grid = {}; let note = ""; let duree_mois = 1;
  try {
    const desc = (prog.description as string) || "";
    if (desc.startsWith("{")) {
      const p = JSON.parse(desc);
      grid = p.grid ?? {}; note = p.note ?? "";
      duree_mois = p.duree_mois ?? (prog.duree_semaines as number ?? 4) / 4;
    } else note = desc;
  } catch {}
  return {
    nom: (prog.nom as string) || "",
    niveau: (prog.niveau as string) || "debutant",
    duree_mois: (prog.duree_mois as number) || duree_mois || 1,
    note, grid,
  };
}

// ─── Video modal ──────────────────────────────────────────────────────────────
function VideoModal({ url, titre, onClose }: { url: string; titre: string; onClose: () => void }) {
  const embed = ytEmbed(url);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 760 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ color: "#F5F5F0", fontSize: 13, fontWeight: 700, margin: 0, fontFamily: "system-ui" }}>{titre}</p>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "#fff", fontSize: 18, cursor: "pointer", padding: "3px 10px" }}>✕</button>
        </div>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", backgroundColor: "#000" }}>
          {embed ? <iframe src={embed} allow="autoplay;fullscreen" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#888", fontFamily: "system-ui" }}>Lien non reconnu</p></div>}
        </div>
      </div>
    </div>
  );
}

// ─── Menu ajout dans une cellule ─────────────────────────────────────────────
function AddMenu({ seances, onAdd, onClose }: {
  seances: SeanceRef[];
  onAdd: (item: CellItem) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"seance" | "rapide" | "video">("seance");
  const [search, setSearch] = useState("");
  const [rapideNom, setRapideNom] = useState("");
  const [rapideNotes, setRapideNotes] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitre, setVideoTitre] = useState("");
  const [videoCat, setVideoCat] = useState(VIDEO_CATS[0]);
  const [videoThumb, setVideoThumb] = useState<string | null>(null);

  function handleVideoUrl(url: string) {
    setVideoUrl(url);
    setVideoThumb(ytThumb(url));
  }

  const filtered = seances.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()));
  const tabStyle = (t: typeof tab): React.CSSProperties => ({
    flex: 1, padding: "8px 4px", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "system-ui", fontWeight: 700,
    backgroundColor: tab === t ? "#fff" : "transparent",
    color: tab === t ? "#B22222" : "#888",
    borderBottom: tab === t ? "2px solid #B22222" : "2px solid transparent",
    transition: "all 0.12s",
  });
  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #e8e8e8", fontSize: 12, fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
      <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 101, width: 300, backgroundColor: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid #efefef", overflow: "hidden" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
          <button style={tabStyle("seance")} onClick={() => setTab("seance")}>📋 Séance</button>
          <button style={tabStyle("rapide")} onClick={() => setTab("rapide")}>⚡ Rapide</button>
          <button style={tabStyle("video")} onClick={() => setTab("video")}>🎬 Vidéo</button>
        </div>

        <div style={{ padding: "12px", maxHeight: 320, overflowY: "auto" }}>

          {/* TAB: séance existante */}
          {tab === "seance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="search" placeholder="Rechercher une séance…" value={search} onChange={e => setSearch(e.target.value)} style={inp} autoFocus />
              {filtered.length === 0 && <p style={{ fontSize: 11, color: "#bbb", fontFamily: "system-ui" }}>Aucune séance trouvée</p>}
              {filtered.map(s => (
                <button key={s.id} onClick={() => { onAdd({ _key: nk(), type: "seance", seanceId: s.id, seanceName: s.nom, duree: s.duree_estimee }); onClose(); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "8px 10px", borderRadius: 7, border: "1px solid #efefef", backgroundColor: "#fafafa", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", fontFamily: "system-ui" }}>{s.nom}</span>
                  {s.duree_estimee && <span style={{ fontSize: 10, color: "#aaa", fontFamily: "system-ui" }}>⏱ {s.duree_estimee} min</span>}
                </button>
              ))}
            </div>
          )}

          {/* TAB: séance rapide */}
          {tab === "rapide" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontFamily: "system-ui" }}>Nom de la séance *</label>
                <input style={inp} value={rapideNom} onChange={e => setRapideNom(e.target.value)} placeholder="Ex: Circuit cardio 20 min" autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontFamily: "system-ui" }}>Notes / description</label>
                <textarea style={{ ...inp, height: 56, resize: "none" }} value={rapideNotes} onChange={e => setRapideNotes(e.target.value)} placeholder="Instructions, exercices, consignes…" />
              </div>
              <button disabled={!rapideNom.trim()}
                onClick={() => { if (!rapideNom.trim()) return; onAdd({ _key: nk(), type: "seance_rapide", nom: rapideNom.trim(), notes: rapideNotes }); onClose(); }}
                style={{ padding: "8px", borderRadius: 7, border: "none", backgroundColor: rapideNom.trim() ? "#B22222" : "#eee", color: rapideNom.trim() ? "#fff" : "#bbb", fontSize: 12, fontWeight: 700, cursor: rapideNom.trim() ? "pointer" : "not-allowed", fontFamily: "system-ui" }}>
                ➕ Ajouter
              </button>
            </div>
          )}

          {/* TAB: vidéo YouTube */}
          {tab === "video" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontFamily: "system-ui" }}>Lien YouTube *</label>
                <input style={inp} type="url" value={videoUrl} onChange={e => handleVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" autoFocus />
                {videoThumb && <img src={videoThumb} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, marginTop: 4 }} />}
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontFamily: "system-ui" }}>Titre</label>
                <input style={inp} value={videoTitre} onChange={e => setVideoTitre(e.target.value)} placeholder="Ex: Séance cardio 45 min" />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontFamily: "system-ui" }}>Catégorie</label>
                <select style={{ ...inp, cursor: "pointer" }} value={videoCat} onChange={e => setVideoCat(e.target.value)}>
                  {VIDEO_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button disabled={!videoUrl.trim()}
                onClick={() => { if (!videoUrl.trim()) return; onAdd({ _key: nk(), type: "video", titre: videoTitre || videoCat, url: videoUrl, categorie: videoCat, thumb: videoThumb }); onClose(); }}
                style={{ padding: "8px", borderRadius: 7, border: "none", backgroundColor: videoUrl.trim() ? "#B22222" : "#eee", color: videoUrl.trim() ? "#fff" : "#bbb", fontSize: 12, fontWeight: 700, cursor: videoUrl.trim() ? "pointer" : "not-allowed", fontFamily: "system-ui" }}>
                🎬 Ajouter la vidéo
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Cellule jour ─────────────────────────────────────────────────────────────
function DayCell({ semaine, jour, items, seances, onAdd, onRemove }: {
  semaine: number; jour: number;
  items: CellItem[];
  seances: SeanceRef[];
  onAdd: (item: CellItem) => void;
  onRemove: (key: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playVideo, setPlayVideo] = useState<{ url: string; titre: string } | null>(null);

  return (
    <div style={{ position: "relative" }}
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault(); setHover(false);
        if (e.dataTransfer.getData("source") !== "seance") return;
        try {
          const s: SeanceRef = JSON.parse(e.dataTransfer.getData("seanceData"));
          onAdd({ _key: nk(), type: "seance", seanceId: s.id, seanceName: s.nom, duree: s.duree_estimee });
        } catch {}
      }}
    >
      <div style={{
        minHeight: 64, borderRadius: 7, padding: "4px 5px",
        border: hover ? "1.5px dashed #B22222" : "1px solid #efefef",
        backgroundColor: hover ? "rgba(178,34,34,0.04)" : "#fff",
        transition: "all 0.1s",
      }}>
        {/* Items */}
        {items.map(item => (
          <div key={item._key} style={{ marginBottom: 3 }}>
            {item.type === "seance" && (
              <div style={{ padding: "4px 6px 4px 8px", borderRadius: 5, backgroundColor: "#f5f9ff", border: "1px solid #dbeafe", borderLeft: "3px solid #3B82F6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>{item.seanceName}</p>
                  {item.duree && <p style={{ fontSize: 8, color: "#93c5fd", margin: "1px 0 0", fontFamily: "system-ui" }}>⏱ {item.duree} min</p>}
                </div>
                <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#bfdbfe", cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 }}>✕</button>
              </div>
            )}
            {item.type === "seance_rapide" && (
              <div style={{ padding: "4px 6px 4px 8px", borderRadius: 5, backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderLeft: "3px solid #F59E0B", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#92400e", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>⚡ {item.nom}</p>
                  {item.notes && <p style={{ fontSize: 8, color: "#b45309", margin: "1px 0 0", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{item.notes}</p>}
                </div>
                <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#fcd34d", cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 }}>✕</button>
              </div>
            )}
            {item.type === "video" && (
              <div style={{ borderRadius: 5, border: "1px solid #e9d5ff", borderLeft: "3px solid #8B5CF6", overflow: "hidden" }}>
                {item.thumb && (
                  <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setPlayVideo({ url: item.url, titre: item.titre })}>
                    <img src={item.thumb} alt="" style={{ width: "100%", height: 44, objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16 }}>▶</span>
                    </div>
                  </div>
                )}
                <div style={{ padding: "3px 6px 3px 6px", backgroundColor: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", margin: 0, fontFamily: "system-ui" }}>{item.titre}</p>
                    <p style={{ fontSize: 8, color: "#c4b5fd", margin: 0, fontFamily: "system-ui" }}>{item.categorie}</p>
                  </div>
                  <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#c4b5fd", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Bouton + */}
        <button onClick={() => setMenuOpen(m => !m)}
          style={{ width: "100%", marginTop: items.length > 0 ? 2 : 0, padding: "3px 0", border: "1px dashed #e0e0e0", borderRadius: 5, backgroundColor: "transparent", color: "#ccc", fontSize: 14, cursor: "pointer", fontFamily: "system-ui", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <span>+</span>
        </button>
      </div>

      {/* Menu popup */}
      {menuOpen && (
        <AddMenu seances={seances} onAdd={item => { onAdd(item); setMenuOpen(false); }} onClose={() => setMenuOpen(false)} />
      )}

      {/* Video modal */}
      {playVideo && <VideoModal url={playVideo.url} titre={playVideo.titre} onClose={() => setPlayVideo(null)} />}
    </div>
  );
}

// ─── Panel séances disponibles ────────────────────────────────────────────────
function SeancesPanel({ seances }: { seances: SeanceRef[] }) {
  const [search, setSearch] = useState("");
  const filtered = seances.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "system-ui" }}>Séances (glisser)</p>
        <input type="search" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "6px 9px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 11, fontFamily: "system-ui", outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map(s => (
          <div key={s.id} draggable
            onDragStart={e => { e.dataTransfer.setData("source", "seance"); e.dataTransfer.setData("seanceData", JSON.stringify(s)); }}
            style={{ padding: "8px 14px", borderBottom: "1px solid #111", cursor: "grab", backgroundColor: "#0D0D0D" }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#111"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D0D"}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: "#F5F5F0", margin: "0 0 2px", fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nom}</p>
            <div style={{ display: "flex", gap: 6 }}>
              {s.niveau && <span style={{ fontSize: 8, color: "#888", fontFamily: "system-ui" }}>{nivLabel(s.niveau)}</span>}
              {s.duree_estimee && <span style={{ fontSize: 8, color: "#555", fontFamily: "system-ui" }}>· {s.duree_estimee} min</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ fontSize: 11, color: "#444", padding: "14px", fontFamily: "system-ui" }}>Aucune séance trouvée</p>}
      </div>
      <div style={{ padding: "7px 14px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 8, color: "#333", margin: 0, fontFamily: "system-ui" }}>⠿ Glisse OU clique + dans la cellule</p>
      </div>
    </div>
  );
}

// ─── Grille semaines × jours ──────────────────────────────────────────────────
function ProgrammeGrid({ data, seances, onChange }: {
  data: ProgrammeData; seances: SeanceRef[];
  onChange: (grid: Grid) => void;
}) {
  const nbSemaines = Math.ceil(data.duree_mois * 4.33);
  const weeks = Array.from({ length: nbSemaines }, (_, i) => i + 1);

  function addToCell(semaine: number, jour: number, item: CellItem) {
    const key = gridKey(semaine, jour);
    onChange({ ...data.grid, [key]: [...(data.grid[key] ?? []), item] });
  }
  function removeFromCell(semaine: number, jour: number, itemKey: string) {
    const key = gridKey(semaine, jour);
    const next = (data.grid[key] ?? []).filter(i => i._key !== itemKey);
    const newGrid = { ...data.grid };
    if (next.length === 0) delete newGrid[key]; else newGrid[key] = next;
    onChange(newGrid);
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {/* En-tête */}
      <div style={{ display: "grid", gridTemplateColumns: `64px repeat(7, minmax(120px, 1fr))`, gap: 4, marginBottom: 4, minWidth: 920 }}>
        <div />
        {JOURS.map(j => (
          <div key={j} style={{ textAlign: "center", padding: "5px 0" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "system-ui" }}>{j}</span>
          </div>
        ))}
      </div>

      {/* Lignes semaines */}
      {weeks.map(s => (
        <div key={s} style={{ display: "grid", gridTemplateColumns: `64px repeat(7, minmax(120px, 1fr))`, gap: 4, marginBottom: 4, minWidth: 920 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 7, color: "#bbb", margin: 0, fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sem.</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", lineHeight: 1 }}>{s}</p>
            </div>
          </div>
          {JOURS.map((_, j) => (
            <DayCell key={j} semaine={s} jour={j + 1}
              items={data.grid[gridKey(s, j + 1)] ?? []}
              seances={seances}
              onAdd={item => addToCell(s, j + 1, item)}
              onRemove={key => removeFromCell(s, j + 1, key)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Builder principal ────────────────────────────────────────────────────────
export interface ProgrammeBuilderProps {
  data: ProgrammeData;
  onChange: (data: ProgrammeData) => void;
}

export default function ProgrammeBuilder({ data, onChange }: ProgrammeBuilderProps) {
  const [seances, setSeances] = useState<SeanceRef[]>([]);

  useEffect(() => {
    fetch("/api/coach/seances").then(r => r.json()).then(d => {
      setSeances((d.seances ?? []).map((s: Record<string, unknown>) => {
        let categorie = "", niveau = "";
        try {
          const desc = (s.description as string) || "";
          if (desc.startsWith("{")) { const p = JSON.parse(desc); categorie = p.categorie ?? ""; niveau = p.niveau ?? ""; }
        } catch {}
        return { id: s.id, nom: s.nom, categorie, niveau, duree_estimee: (s.duree_estimee as number | null) ?? null };
      }));
    });
  }, []);

  const totalItems = Object.values(data.grid).reduce((a, items) => a + items.length, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 500, border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
      <SeancesPanel seances={seances} />
      <div style={{ backgroundColor: "#f9f9f9", padding: "14px", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px", fontFamily: "system-ui" }}>Description</p>
            <input value={data.note} onChange={e => onChange({ ...data, note: e.target.value })} placeholder="Objectif du programme…"
              style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", backgroundColor: "#fff", fontSize: 12, fontFamily: "system-ui", outline: "none", minWidth: 240 }} />
          </div>
          <p style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui", margin: 0 }}>
            {totalItems} élément{totalItems > 1 ? "s" : ""} planifié{totalItems > 1 ? "s" : ""}
          </p>
        </div>
        <ProgrammeGrid data={data} seances={seances} onChange={grid => onChange({ ...data, grid })} />
      </div>
    </div>
  );
}
