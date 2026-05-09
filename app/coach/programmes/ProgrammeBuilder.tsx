"use client";

import { useState, useEffect, useCallback } from "react";
import { NIVEAUX, CATEGORIES, defaultBloc, type SeanceData } from "../seances/SeanceBuilder";
import SeanceBuildComp from "../seances/SeanceBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeanceRef {
  id: string; nom: string; categorie: string; niveau: string; duree_estimee: number | null;
}
export type CellItem =
  | { _key: string; type: "seance";        seanceId: string; seanceName: string; duree: number | null }
  | { _key: string; type: "seance_locale"; nom: string; duree: number | null; seanceData: SeanceData }
  | { _key: string; type: "video";         titre: string; url: string; categorie: string; thumb: string | null };
export type Grid = Record<string, CellItem[]>;
export interface ProgrammeData {
  nom: string; niveau: string; duree_semaines: number; note: string; grid: Grid;
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

// ─── Encode / Decode ──────────────────────────────────────────────────────────
export function encodeProgData(d: ProgrammeData): string {
  return JSON.stringify({ grid: d.grid, note: d.note, duree_semaines: d.duree_semaines });
}
export function decodeProgData(prog: Record<string, unknown>): ProgrammeData {
  let grid: Grid = {}; let note = ""; let duree_semaines = 4;
  try {
    const desc = (prog.description as string) || "";
    if (desc.startsWith("{")) {
      const p = JSON.parse(desc);
      grid = p.grid ?? {}; note = p.note ?? "";
      duree_semaines = p.duree_semaines ?? (prog.duree_semaines as number ?? 4);
    } else note = desc;
  } catch {}
  return {
    nom: (prog.nom as string) || "",
    niveau: (prog.niveau as string) || "debutant",
    duree_semaines: (prog.duree_semaines as number) || duree_semaines || 4,
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

// ─── Créateur de séance inline (modal complet) ────────────────────────────────
function InlineSeanceCreator({ jourLabel, onCreated, onClose }: {
  jourLabel: string;
  onCreated: (seanceData: SeanceData) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1|2>(1);
  const [seanceData, setSeanceData] = useState<SeanceData>({
    nom: "", categorie: "full_body", niveau: "debutant", duree_estimee: "45", note: "",
    blocs: [defaultBloc("echauffement"), defaultBloc("corps", 1)],
  });
  const [error, setError] = useState("");

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  function handleSave() {
    if (!seanceData.nom.trim()) { setError("Nom obligatoire."); return; }
    // Pas d'appel API — stockée uniquement dans le programme
    onCreated(seanceData);
  }

  const totalExercices = seanceData.blocs.reduce((a, b) =>
    a + (b.format === "tabata" ? b.tabata_exercices?.length ?? 0 : b.rich_exercices?.length ?? 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(900px, 95vw)", backgroundColor: "#0D0D0D", display: "flex", flexDirection: "column", boxShadow: "-4px 0 40px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: "#B22222", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>
              Nouvelle séance → {jourLabel}
            </p>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
              {step === 1 ? "Informations de la séance" : seanceData.nom || "Construction"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, color: "#888", fontSize: 16, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕ Annuler</button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
          {[{n:1,l:"Infos"},{n:2,l:"Blocs & exercices"}].map(({n,l},i) => (
            <div key={n} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div style={{ width: 30, height: 2, backgroundColor: step > 1 ? "#B22222" : "#222" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: n < step ? "pointer" : "default" }} onClick={() => n < step && setStep(n as 1|2)}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: step >= n ? "#B22222" : "#1a1a1a", color: step >= n ? "#fff" : "#555", fontSize: 10, fontWeight: 700, fontFamily: "system-ui" }}>{n}</div>
                <span style={{ fontSize: 11, fontWeight: step === n ? 700 : 400, color: step === n ? "#F5F5F0" : "#555", fontFamily: "system-ui" }}>{l}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Étape 1 */}
          {step === 1 && (
            <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Nom de la séance *</label>
                <input style={inp} value={seanceData.nom} onChange={e => setSeanceData(d => ({ ...d, nom: e.target.value }))} placeholder="Ex: Full Body Débutant" autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Catégorie</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={seanceData.categorie} onChange={e => setSeanceData(d => ({ ...d, categorie: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Niveau</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={seanceData.niveau} onChange={e => setSeanceData(d => ({ ...d, niveau: e.target.value }))}>
                    {NIVEAUX.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <label style={lbl}>Durée estimée</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input style={{ ...inp, width: 80, textAlign: "center" }} type="number" min="1" value={seanceData.duree_estimee} onChange={e => setSeanceData(d => ({ ...d, duree_estimee: e.target.value }))} />
                    <span style={{ fontSize: 12, color: "#555", fontFamily: "system-ui" }}>min</span>
                  </div>
                </div>
              </div>
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
              <button onClick={() => { if (!seanceData.nom.trim()) { setError("Nom obligatoire."); return; } setError(""); setStep(2); }}
                disabled={!seanceData.nom.trim()}
                style={{ padding: "12px", borderRadius: 9, border: "none", backgroundColor: !seanceData.nom.trim() ? "#1a1a1a" : "#B22222", color: !seanceData.nom.trim() ? "#555" : "#fff", fontSize: 14, fontWeight: 700, cursor: !seanceData.nom.trim() ? "not-allowed" : "pointer", fontFamily: "system-ui" }}>
                Suivant → Construire la séance
              </button>
            </div>
          )}

          {/* Étape 2 */}
          {step === 2 && (
            <div>
              <SeanceBuildComp data={seanceData} onChange={setSeanceData} />
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>{error}</p>}
              <button onClick={handleSave}
                style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: "#B22222", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                {`✅ Ajouter au programme (${totalExercices} exercice${totalExercices > 1 ? "s" : ""})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Menu ajout cellule ───────────────────────────────────────────────────────
function AddMenu({ seances, onAdd, onCreateSeance, onClose }: {
  seances: SeanceRef[];
  onAdd: (item: CellItem) => void;
  onCreateSeance: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"seance" | "video">("seance");
  const [search, setSearch] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitre, setVideoTitre] = useState("");
  const [videoCat, setVideoCat] = useState(VIDEO_CATS[0]);
  const [videoThumb, setVideoThumb] = useState<string | null>(null);

  function handleVideoUrl(url: string) { setVideoUrl(url); setVideoThumb(ytThumb(url)); }
  const filtered = seances.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()));
  const tabStyle = (t: typeof tab): React.CSSProperties => ({
    flex: 1, padding: "8px 4px", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "system-ui", fontWeight: 700,
    backgroundColor: tab === t ? "#fff" : "transparent", color: tab === t ? "#B22222" : "#888",
    borderBottom: tab === t ? "2px solid #B22222" : "2px solid transparent", transition: "all 0.12s",
  });
  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #e8e8e8", fontSize: 12, fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
      <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 101, width: 300, backgroundColor: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: "1px solid #efefef", overflow: "hidden" }}>
        {/* Bouton créer séance */}
        <button
          onClick={() => { onClose(); onCreateSeance(); }}
          style={{ width: "100%", padding: "11px 14px", border: "none", borderBottom: "1px solid #efefef", backgroundColor: "#B22222", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
        >
          <span style={{ fontSize: 16 }}>➕</span>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Créer une séance</p>
            <p style={{ margin: 0, fontSize: 10, opacity: 0.8 }}>Construire depuis zéro pour ce jour</p>
          </div>
        </button>

        {/* Tabs séance existante / vidéo */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
          <button style={tabStyle("seance")} onClick={() => setTab("seance")}>📋 Séance existante</button>
          <button style={tabStyle("video")} onClick={() => setTab("video")}>🎬 Vidéo YouTube</button>
        </div>

        <div style={{ padding: "12px", maxHeight: 280, overflowY: "auto" }}>
          {/* Séance existante */}
          {tab === "seance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

          {/* Vidéo */}
          {tab === "video" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontFamily: "system-ui" }}>Lien YouTube *</label>
                <input style={inp} type="url" value={videoUrl} onChange={e => handleVideoUrl(e.target.value)} placeholder="https://youtube.com/…" autoFocus />
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
                🎬 Ajouter
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Cellule jour ─────────────────────────────────────────────────────────────
function DayCell({ semaine, jour, items, seances, onAdd, onRemove, onCreateSeance }: {
  semaine: number; jour: number; items: CellItem[]; seances: SeanceRef[];
  onAdd: (item: CellItem) => void;
  onRemove: (key: string) => void;
  onCreateSeance: (semaine: number, jour: number) => void;
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
      <div style={{ minHeight: 64, borderRadius: 7, padding: "4px 5px", border: hover ? "1.5px dashed #B22222" : "1px solid #efefef", backgroundColor: hover ? "rgba(178,34,34,0.04)" : "#fff", transition: "all 0.1s" }}>
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
            {item.type === "seance_locale" && (
              <div style={{ padding: "4px 6px 4px 8px", borderRadius: 5, backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderLeft: "3px solid #F59E0B", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#92400e", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>⚡ {item.nom}</p>
                  {item.duree && <p style={{ fontSize: 8, color: "#b45309", margin: "1px 0 0", fontFamily: "system-ui" }}>⏱ {item.duree} min</p>}
                </div>
                <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#fcd34d", cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 }}>✕</button>
              </div>
            )}
            {item.type === "video" && (
              <div style={{ borderRadius: 5, border: "1px solid #e9d5ff", borderLeft: "3px solid #8B5CF6", overflow: "hidden" }}>
                {item.thumb && (
                  <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setPlayVideo({ url: item.url, titre: item.titre })}>
                    <img src={item.thumb} alt="" style={{ width: "100%", height: 44, objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 16 }}>▶</span></div>
                  </div>
                )}
                <div style={{ padding: "3px 6px", backgroundColor: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
        <button onClick={() => setMenuOpen(m => !m)}
          style={{ width: "100%", marginTop: items.length > 0 ? 2 : 0, padding: "3px 0", border: "1px dashed #e0e0e0", borderRadius: 5, backgroundColor: "transparent", color: "#ccc", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          +
        </button>
      </div>

      {menuOpen && (
        <AddMenu
          seances={seances}
          onAdd={item => { onAdd(item); setMenuOpen(false); }}
          onCreateSeance={() => { setMenuOpen(false); onCreateSeance(semaine, jour); }}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {playVideo && <VideoModal url={playVideo.url} titre={playVideo.titre} onClose={() => setPlayVideo(null)} />}
    </div>
  );
}

// ─── Panel séances ────────────────────────────────────────────────────────────
function SeancesPanel({ seances, onRefresh }: { seances: SeanceRef[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = seances.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px", fontFamily: "system-ui" }}>Séances existantes</p>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="search" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "6px 9px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#F5F5F0", fontSize: 11, fontFamily: "system-ui", outline: "none", boxSizing: "border-box" }} />
          <button onClick={onRefresh} title="Actualiser" style={{ padding: "6px 9px", borderRadius: 6, border: "1px solid #1e1e1e", backgroundColor: "#161616", color: "#666", fontSize: 13, cursor: "pointer" }}>↺</button>
        </div>
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
        {filtered.length === 0 && <p style={{ fontSize: 11, color: "#444", padding: "14px", fontFamily: "system-ui" }}>Aucune séance</p>}
      </div>
      <div style={{ padding: "7px 14px", borderTop: "1px solid #1a1a1a", flexShrink: 0 }}>
        <p style={{ fontSize: 8, color: "#333", margin: 0, fontFamily: "system-ui" }}>⠿ Glisse OU clique + dans la cellule</p>
      </div>
    </div>
  );
}

// ─── Grille ───────────────────────────────────────────────────────────────────
function ProgrammeGrid({ data, seances, onChange, onCreateSeance }: {
  data: ProgrammeData; seances: SeanceRef[];
  onChange: (grid: Grid) => void;
  onCreateSeance: (s: number, j: number) => void;
}) {
  const weeks = Array.from({ length: data.duree_semaines }, (_, i) => i + 1);
  function addToCell(s: number, j: number, item: CellItem) {
    const key = gridKey(s, j);
    onChange({ ...data.grid, [key]: [...(data.grid[key] ?? []), item] });
  }
  function removeFromCell(s: number, j: number, itemKey: string) {
    const key = gridKey(s, j);
    const next = (data.grid[key] ?? []).filter(i => i._key !== itemKey);
    const newGrid = { ...data.grid };
    if (next.length === 0) delete newGrid[key]; else newGrid[key] = next;
    onChange(newGrid);
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `64px repeat(7, minmax(120px, 1fr))`, gap: 4, marginBottom: 4, minWidth: 920 }}>
        <div />
        {JOURS.map(j => <div key={j} style={{ textAlign: "center", padding: "5px 0" }}><span style={{ fontSize: 9, fontWeight: 700, color: "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "system-ui" }}>{j}</span></div>)}
      </div>
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
              onCreateSeance={onCreateSeance}
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
  const [creatorTarget, setCreatorTarget] = useState<{ semaine: number; jour: number } | null>(null);

  const loadSeances = useCallback(() => {
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

  useEffect(() => { loadSeances(); }, [loadSeances]);

  const totalItems = Object.values(data.grid).reduce((a, items) => a + items.length, 0);

  function handleSeanceCreated(seanceData: SeanceData) {
    if (!creatorTarget) return;
    const key = gridKey(creatorTarget.semaine, creatorTarget.jour);
    const item: CellItem = {
      _key: nk(),
      type: "seance_locale",
      nom: seanceData.nom,
      duree: parseInt(seanceData.duree_estimee) || null,
      seanceData,
    };
    onChange({ ...data, grid: { ...data.grid, [key]: [...(data.grid[key] ?? []), item] } });
    setCreatorTarget(null);
    // Pas de refresh des séances globales — la séance locale n'est pas dans la DB
  }

  const jourLabel = creatorTarget
    ? `${JOURS[creatorTarget.jour - 1]} — Semaine ${creatorTarget.semaine}`
    : "";

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 500, border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
        <SeancesPanel seances={seances} onRefresh={loadSeances} />
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
          <ProgrammeGrid
            data={data} seances={seances}
            onChange={grid => onChange({ ...data, grid })}
            onCreateSeance={(s, j) => setCreatorTarget({ semaine: s, jour: j })}
          />
        </div>
      </div>

      {creatorTarget && (
        <InlineSeanceCreator
          jourLabel={jourLabel}
          onCreated={handleSeanceCreated}
          onClose={() => setCreatorTarget(null)}
        />
      )}
    </>
  );
}
