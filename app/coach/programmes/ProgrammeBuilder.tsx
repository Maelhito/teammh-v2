"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NIVEAUX, CATEGORIES, defaultBloc, decodeSeance, type SeanceData } from "../seances/SeanceBuilder";
import SeanceBuildComp from "../seances/SeanceBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeanceRef {
  id: string; nom: string; categorie: string; niveau: string; duree_estimee: number | null;
}
export type CellItem =
  | { _key: string; type: "seance";        seanceId: string; seanceName: string; duree: number | null }
  // groupId relie les copies d'une même séance répétée sur plusieurs semaines.
  // Sans lui, l'édition retrouvait ses copies par NOM et emportait au passage
  // toute autre séance homonyme du programme. Absent sur les anciens programmes.
  | { _key: string; type: "seance_locale"; nom: string; duree: number | null; seanceData: SeanceData; groupId?: string }
  | { _key: string; type: "video";         titre: string; url: string; categorie: string; thumb: string | null };
export type Grid = Record<string, CellItem[]>;
export interface ProgrammeData {
  nom: string; niveau: string; duree_semaines: number; note: string; grid: Grid;
}

// ─── Const ───────────────────────────────────────────────────────────────────
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const VIDEO_CATS = ["Échauffement", "Cardio", "Étirements", "Mobilité", "Coaching", "Nutrition", "Mental", "Autre"];
export function gridKey(s: number, j: number) { return `S${s}_J${j}`; }
/** Compte les éléments visibles et ceux situés au-delà de la durée du
 *  programme. Réduire la durée masque ces semaines sans effacer leur contenu :
 *  il ne faut donc ni les compter comme planifiés, ni les passer sous silence. */
export function countGridItems(grid: Grid, duree_semaines: number): { visibles: number; masques: number } {
  let visibles = 0, masques = 0;
  for (const [key, items] of Object.entries(grid)) {
    const semaine = parseInt(key.slice(1).split("_")[0]) || 0;
    if (semaine <= duree_semaines) visibles += items.length; else masques += items.length;
  }
  return { visibles, masques };
}
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
  let grid: Grid = {}; let note = ""; let duree_semaines: number | null = null;
  try {
    const desc = (prog.description as string) || "";
    if (desc.startsWith("{")) {
      const p = JSON.parse(desc);
      grid = p.grid ?? {}; note = p.note ?? "";
      duree_semaines = typeof p.duree_semaines === "number" ? p.duree_semaines : null;
    } else note = desc;
  } catch {}
  return {
    nom: (prog.nom as string) || "",
    niveau: (prog.niveau as string) || "debutant",
    // La durée encodée dans le JSON prime : pour une assignation, ce JSON est le
    // grid_data de la cliente, dont la durée peut différer de celle du template.
    duree_semaines: duree_semaines || (prog.duree_semaines as number) || 4,
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
function InlineSeanceCreator({ jourLabel, duree_semaines, semaine_debut, onCreated, onClose }: {
  jourLabel: string;
  duree_semaines: number;
  semaine_debut: number;
  onCreated: (seanceData: SeanceData, repetitions: number) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1|2>(1);
  const [seanceData, setSeanceData] = useState<SeanceData>({
    nom: "", categorie: "full_body", niveau: "debutant", duree_estimee: "45", note: "",
    blocs: [defaultBloc("echauffement"), defaultBloc("corps", 1)],
  });
  const [repetitions, setRepetitions] = useState(1);
  const [error, setError] = useState("");

  // Max répétitions = semaines restantes depuis la semaine de début
  const maxRep = Math.max(1, duree_semaines - semaine_debut + 1);

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e0e0e0", backgroundColor: "#f8f8f8", fontSize: 13, color: "#1a1a1a", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  function handleSave() {
    if (!seanceData.nom.trim()) { setError("Nom obligatoire."); return; }
    onCreated(seanceData, repetitions);
  }

  const totalExercices = seanceData.blocs.reduce((a, b) =>
    a + (b.format === "tabata" ? b.tabata_exercices?.length ?? 0 : b.rich_exercices?.length ?? 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(900px, 95vw)", backgroundColor: "#fff", display: "flex", flexDirection: "column", boxShadow: "-4px 0 40px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, backgroundColor: "#fff" }}>
          <div>
            <p style={{ fontSize: 10, color: "#B22222", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>
              Nouvelle séance → {jourLabel}
            </p>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
              {step === 1 ? "Informations de la séance" : seanceData.nom || "Construction"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "#f4f4f4", border: "none", borderRadius: 7, color: "#888", fontSize: 16, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕ Annuler</button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 0, flexShrink: 0, backgroundColor: "#fafafa" }}>
          {[{n:1,l:"Infos"},{n:2,l:"Blocs & exercices"}].map(({n,l},i) => (
            <div key={n} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div style={{ width: 30, height: 2, backgroundColor: step > 1 ? "#B22222" : "#e0e0e0" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: n < step ? "pointer" : "default" }} onClick={() => n < step && setStep(n as 1|2)}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: step >= n ? "#B22222" : "#e8e8e8", color: step >= n ? "#fff" : "#aaa", fontSize: 10, fontWeight: 700, fontFamily: "system-ui" }}>{n}</div>
                <span style={{ fontSize: 11, fontWeight: step === n ? 700 : 400, color: step === n ? "#1a1a1a" : "#aaa", fontFamily: "system-ui" }}>{l}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", backgroundColor: "#fff" }}>

          {/* Étape 1 */}
          {step === 1 && (
            <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>

              <div>
                <label style={lbl}>Nom de la séance *</label>
                <input style={inp} value={seanceData.nom} onChange={e => setSeanceData(d => ({ ...d, nom: e.target.value }))} placeholder="Ex: Full Body Circuit" autoFocus />
              </div>

              <div>
                <label style={lbl}>Durée estimée</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input style={{ ...inp, width: 90, textAlign: "center" }} type="number" min="1" value={seanceData.duree_estimee} onChange={e => setSeanceData(d => ({ ...d, duree_estimee: e.target.value }))} />
                  <span style={{ fontSize: 12, color: "#555", fontFamily: "system-ui" }}>min</span>
                </div>
              </div>

              <div>
                <label style={lbl}>Répétition — combien de semaines ?</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    style={{ ...inp, width: 90, textAlign: "center" }}
                    type="number" min="1" max={maxRep}
                    value={repetitions}
                    onChange={e => setRepetitions(Math.min(maxRep, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <span style={{ fontSize: 12, color: "#555", fontFamily: "system-ui" }}>
                    semaine{repetitions > 1 ? "s" : ""}
                    {repetitions > 1 && (
                      <span style={{ color: "#B22222", marginLeft: 6 }}>
                        → Sem. {semaine_debut} à {Math.min(semaine_debut + repetitions - 1, duree_semaines)}
                      </span>
                    )}
                  </span>
                </div>
                <input type="range" min="1" max={maxRep} value={repetitions}
                  onChange={e => setRepetitions(parseInt(e.target.value))}
                  style={{ width: "100%", marginTop: 8, accentColor: "#B22222" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: "#444", fontFamily: "system-ui" }}>1 sem.</span>
                  <span style={{ fontSize: 9, color: "#444", fontFamily: "system-ui" }}>{maxRep} sem.</span>
                </div>
                <p style={{ fontSize: 10, color: "#555", margin: "6px 0 0", fontFamily: "system-ui" }}>
                  La séance sera ajoutée sur le même jour pendant {repetitions} semaine{repetitions > 1 ? "s" : ""} consécutive{repetitions > 1 ? "s" : ""}.
                </p>
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

// ─── Éditeur de séance inline (modification + gestion semaines) ──────────────
function InlineSeanceEditor({ seanceData: initialData, jourLabel, semaine, jour, duree_semaines, grid, itemNom, itemGroupId, onSaved, onClose }: {
  seanceData: SeanceData;
  jourLabel: string;
  semaine: number;
  jour: number;
  duree_semaines: number;
  grid: Grid;
  itemNom: string;
  itemGroupId?: string;
  onSaved: (seanceData: SeanceData, selectedWeeks: number[], selectedJour: number) => void;
  onClose: () => void;
}) {
  const [seanceData, setSeanceData] = useState<SeanceData>(initialData);
  const [step, setStep] = useState<1|2|3>(2);
  const [error, setError] = useState("");
  const [selectedJour, setSelectedJour] = useState(jour);

  // Semaines où cette séance existe déjà, sur ce jour. On suit le groupe de
  // copies quand il est connu, sinon le nom (programmes créés avant groupId).
  const initialWeeks = Array.from({ length: duree_semaines }, (_, i) => i + 1).filter(s => {
    const key = gridKey(s, jour);
    return (grid[key] ?? []).some(i => i.type === "seance_locale" && (itemGroupId
      ? i.groupId === itemGroupId
      : !i.groupId && i.nom === itemNom));
  });
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>(initialWeeks.length > 0 ? initialWeeks : [semaine]);

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e0e0e0", backgroundColor: "#f8f8f8", fontSize: 13, color: "#1a1a1a", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };

  const totalExercices = seanceData.blocs.reduce((a, b) =>
    a + (b.format === "tabata" ? b.tabata_exercices?.length ?? 0 : b.rich_exercices?.length ?? 0), 0);

  const STEPS = [{n:1,l:"Infos"},{n:2,l:"Blocs & exercices"},{n:3,l:"Planification"}];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(900px, 95vw)", backgroundColor: "#fff", display: "flex", flexDirection: "column", boxShadow: "-4px 0 40px rgba(0,0,0,0.15)" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, backgroundColor: "#fff" }}>
          <div>
            <p style={{ fontSize: 10, color: "#F59E0B", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>
              Modifier · {jourLabel}
            </p>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
              {seanceData.nom || "Sans titre"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "#f4f4f4", border: "none", borderRadius: 7, color: "#888", fontSize: 16, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕ Fermer</button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", flexShrink: 0, backgroundColor: "#fafafa" }}>
          {STEPS.map(({n,l},i) => (
            <div key={n} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div style={{ width: 30, height: 2, backgroundColor: step > i ? "#F59E0B" : "#e0e0e0" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => setStep(n as 1|2|3)}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: step >= n ? "#F59E0B" : "#e8e8e8", color: step >= n ? "#fff" : "#aaa", fontSize: 10, fontWeight: 700, fontFamily: "system-ui" }}>{n}</div>
                <span style={{ fontSize: 11, fontWeight: step === n ? 700 : 400, color: step === n ? "#1a1a1a" : "#aaa", fontFamily: "system-ui" }}>{l}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", backgroundColor: "#fff" }}>

          {/* Étape 1 : Infos */}
          {step === 1 && (
            <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={lbl}>Nom de la séance *</label>
                <input style={inp} value={seanceData.nom} onChange={e => setSeanceData(d => ({ ...d, nom: e.target.value }))} autoFocus />
              </div>
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, fontFamily: "system-ui" }}>{error}</p>}
              <button onClick={() => { if (!seanceData.nom.trim()) { setError("Nom obligatoire."); return; } setStep(2); }}
                style={{ padding: "12px", borderRadius: 9, border: "none", backgroundColor: "#F59E0B", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                Suivant → Modifier les blocs
              </button>
            </div>
          )}

          {/* Étape 2 : Builder */}
          {step === 2 && (
            <div>
              <SeanceBuildComp data={seanceData} onChange={setSeanceData} />
              {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "10px 0 0", fontFamily: "system-ui" }}>{error}</p>}
              <button onClick={() => setStep(3)}
                style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: "#F59E0B", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                Suivant → Gérer la planification
              </button>
            </div>
          )}

          {/* Étape 3 : Planification */}
          {step === 3 && (
            <PlanningStep
              duree_semaines={duree_semaines}
              semaine={semaine}
              selectedWeeks={selectedWeeks}
              setSelectedWeeks={setSelectedWeeks}
              selectedJour={selectedJour}
              setSelectedJour={setSelectedJour}
              color="#F59E0B"
              onSave={() => { if (!seanceData.nom.trim()) { setError("Nom obligatoire."); return; } onSaved(seanceData, selectedWeeks, selectedJour); }}
              saveLabel="✅ Sauvegarder les modifications"
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PlanningStep (sélecteur jour + semaines partagé) ────────────────────────
function PlanningStep({ duree_semaines, semaine, selectedWeeks, setSelectedWeeks, selectedJour, setSelectedJour, color, onSave, saveLabel, error }: {
  duree_semaines: number;
  semaine: number;
  selectedWeeks: number[];
  setSelectedWeeks: (w: number[]) => void;
  selectedJour: number;
  setSelectedJour: (j: number) => void;
  color: string;
  onSave: () => void;
  saveLabel: string;
  error?: string;
}) {
  const allWeeks = Array.from({ length: duree_semaines }, (_, i) => i + 1);
  const allSelected = selectedWeeks.length === duree_semaines;
  function toggleWeek(s: number) {
    setSelectedWeeks(selectedWeeks.includes(s)
      ? (selectedWeeks.length > 1 ? selectedWeeks.filter(w => w !== s) : selectedWeeks)
      : [...selectedWeeks, s].sort((a, b) => a - b));
  }
  const JOURS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontFamily: "system-ui" }}>Jour de la semaine</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {JOURS_SHORT.map((j, i) => {
          const on = selectedJour === i + 1;
          return (
            <button key={i} onClick={() => setSelectedJour(i + 1)}
              style={{ padding: "8px 14px", borderRadius: 8, border: `2px solid ${on ? color : "#2a2a2a"}`, backgroundColor: on ? `${color}20` : "#111", color: on ? color : "#555", fontSize: 12, fontWeight: on ? 800 : 400, cursor: "pointer", fontFamily: "system-ui", transition: "all 0.12s" }}>
              {j}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontFamily: "system-ui" }}>Semaines</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setSelectedWeeks(allWeeks)}
          style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${allSelected ? color : "#2a2a2a"}`, backgroundColor: allSelected ? `${color}20` : "transparent", color: allSelected ? color : "#888", fontSize: 11, cursor: "pointer", fontFamily: "system-ui", fontWeight: 700 }}>
          Toutes ({duree_semaines})
        </button>
        <button onClick={() => setSelectedWeeks([semaine])}
          style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>
          Sem. {semaine} seulement
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {allWeeks.map(s => {
          const on = selectedWeeks.includes(s);
          return (
            <button key={s} onClick={() => toggleWeek(s)}
              style={{ width: 46, height: 46, borderRadius: 9, border: `2px solid ${on ? color : "#2a2a2a"}`, backgroundColor: on ? `${color}20` : "#111", color: on ? color : "#555", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "system-ui", transition: "all 0.12s" }}>
              {s}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "#555", margin: "0 0 20px", fontFamily: "system-ui" }}>
        {selectedWeeks.length} semaine{selectedWeeks.length > 1 ? "s" : ""} · {JOURS_SHORT[selectedJour - 1]} · sem. {selectedWeeks.join(", ")}
      </p>
      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "0 0 12px", fontFamily: "system-ui" }}>{error}</p>}
      <button onClick={onSave}
        style={{ width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: color, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
        {saveLabel}
      </button>
    </div>
  );
}

// ─── Éditeur séances DB (copie locale) ───────────────────────────────────────
function InlineDbSeanceEditor({ item, semaine, jour, duree_semaines, onSaved, onClose }: {
  item: CellItem & { type: "seance" };
  semaine: number;
  jour: number;
  duree_semaines: number;
  onSaved: (seanceData: SeanceData, selectedWeeks: number[], selectedJour: number) => void;
  onClose: () => void;
}) {
  const [seanceData, setSeanceData] = useState<SeanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1|2|3>(2);
  const [error, setError] = useState("");
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([semaine]);
  const [selectedJour, setSelectedJour] = useState(jour);

  useEffect(() => {
    fetch(`/api/coach/seances/${item.seanceId}`)
      .then(r => r.json())
      .then(d => {
        setSeanceData(d.seance
          ? decodeSeance(d.seance, d.exercices ?? [])
          : { nom: item.seanceName, categorie: "full_body", niveau: "debutant", duree_estimee: item.duree?.toString() ?? "45", note: "", blocs: [defaultBloc("echauffement"), defaultBloc("corps", 1)] }
        );
        setLoading(false);
      })
      .catch(() => {
        setSeanceData({ nom: item.seanceName, categorie: "full_body", niveau: "debutant", duree_estimee: item.duree?.toString() ?? "45", note: "", blocs: [defaultBloc("echauffement"), defaultBloc("corps", 1)] });
        setLoading(false);
      });
  }, [item.seanceId, item.seanceName, item.duree]);

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#161616", fontSize: 13, color: "#F5F5F0", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui" };
  const totalEx = seanceData?.blocs.reduce((a, b) => a + (b.format === "tabata" ? b.tabata_exercices?.length ?? 0 : b.rich_exercices?.length ?? 0), 0) ?? 0;
  const STEPS = [{n:1,l:"Infos"},{n:2,l:"Blocs & exercices"},{n:3,l:"Planification"}];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(900px, 95vw)", backgroundColor: "#0D0D0D", display: "flex", flexDirection: "column", boxShadow: "-4px 0 40px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: "#3B82F6", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Modifier (copie locale) · {JOURS[jour - 1]}</p>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>{item.seanceName}</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, color: "#888", fontSize: 16, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕ Fermer</button>
        </div>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", flexShrink: 0 }}>
          {STEPS.map(({n,l},i) => (
            <div key={n} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div style={{ width: 30, height: 2, backgroundColor: step > i ? "#3B82F6" : "#222" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }} onClick={() => !loading && setStep(n as 1|2|3)}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: step >= n ? "#3B82F6" : "#1a1a1a", color: step >= n ? "#fff" : "#555", fontSize: 10, fontWeight: 700, fontFamily: "system-ui" }}>{n}</div>
                <span style={{ fontSize: 11, fontWeight: step === n ? 700 : 400, color: step === n ? "#F5F5F0" : "#555", fontFamily: "system-ui" }}>{l}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {loading && <p style={{ fontSize: 13, color: "#555", fontFamily: "system-ui" }}>Chargement de la séance…</p>}
          {!loading && seanceData && step === 1 && (
            <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>
              <div><label style={lbl}>Nom *</label><input style={inp} value={seanceData.nom} onChange={e => setSeanceData(d => d ? { ...d, nom: e.target.value } : d)} /></div>
              <p style={{ fontSize: 11, color: "#555", margin: 0, fontFamily: "system-ui" }}>⚠ Les modifications ne toucheront pas la séance originale — une copie locale sera créée dans ce programme.</p>
              <button onClick={() => setStep(2)} style={{ padding: "12px", borderRadius: 9, border: "none", backgroundColor: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>Suivant → Modifier les blocs</button>
            </div>
          )}
          {!loading && seanceData && step === 2 && (
            <div>
              <SeanceBuildComp data={seanceData} onChange={d => setSeanceData(d)} />
              <button onClick={() => setStep(3)} style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 9, border: "none", backgroundColor: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>
                Suivant → Planification ({totalEx} exercice{totalEx > 1 ? "s" : ""})
              </button>
            </div>
          )}
          {!loading && seanceData && step === 3 && (
            <PlanningStep
              duree_semaines={duree_semaines} semaine={semaine}
              selectedWeeks={selectedWeeks} setSelectedWeeks={setSelectedWeeks}
              selectedJour={selectedJour} setSelectedJour={setSelectedJour}
              color="#3B82F6"
              onSave={() => { if (!seanceData.nom.trim()) { setError("Nom obligatoire."); return; } onSaved(seanceData, selectedWeeks, selectedJour); }}
              saveLabel="✅ Enregistrer la copie locale"
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Planificateur vidéo ──────────────────────────────────────────────────────
function InlineVideoPlannerPanel({ item, semaine, jour, duree_semaines, onSaved, onClose }: {
  item: CellItem & { type: "video" };
  semaine: number;
  jour: number;
  duree_semaines: number;
  onSaved: (selectedWeeks: number[], selectedJour: number) => void;
  onClose: () => void;
}) {
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([semaine]);
  const [selectedJour, setSelectedJour] = useState(jour);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(520px, 95vw)", backgroundColor: "#0D0D0D", display: "flex", flexDirection: "column", boxShadow: "-4px 0 40px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: "#8B5CF6", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Planifier la vidéo</p>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>{item.titre}</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, color: "#888", fontSize: 16, cursor: "pointer", padding: "6px 12px", fontFamily: "system-ui" }}>✕</button>
        </div>
        {item.thumb && (
          <div style={{ margin: "14px 20px 0", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            <img src={item.thumb} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <PlanningStep
            duree_semaines={duree_semaines} semaine={semaine}
            selectedWeeks={selectedWeeks} setSelectedWeeks={setSelectedWeeks}
            selectedJour={selectedJour} setSelectedJour={setSelectedJour}
            color="#8B5CF6"
            onSave={() => onSaved(selectedWeeks, selectedJour)}
            saveLabel="✅ Planifier la vidéo"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Cellule jour ─────────────────────────────────────────────────────────────
function DayCell({ semaine, jour, items, seances, onAdd, onRemove, onCreateSeance, onEditSeance, onEditDbSeance, onEditVideo }: {
  semaine: number; jour: number; items: CellItem[]; seances: SeanceRef[];
  onAdd: (item: CellItem) => void;
  onRemove: (key: string) => void;
  onCreateSeance: (semaine: number, jour: number) => void;
  onEditSeance: (item: CellItem & { type: "seance_locale" }, semaine: number, jour: number) => void;
  onEditDbSeance: (item: CellItem & { type: "seance" }, semaine: number, jour: number) => void;
  onEditVideo: (item: CellItem & { type: "video" }, semaine: number, jour: number) => void;
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
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onEditDbSeance(item as CellItem & { type: "seance" }, semaine, jour)}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>{item.seanceName}</p>
                  {item.duree && <p style={{ fontSize: 8, color: "#93c5fd", margin: "1px 0 0", fontFamily: "system-ui" }}>⏱ {item.duree} min</p>}
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => onEditDbSeance(item as CellItem & { type: "seance" }, semaine, jour)} style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: 11, padding: "0 3px" }} title="Modifier">✏</button>
                  <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#bfdbfe", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
                </div>
              </div>
            )}
            {item.type === "seance_locale" && (
              <div style={{ padding: "4px 6px 4px 8px", borderRadius: 5, backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderLeft: "3px solid #F59E0B", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onEditSeance(item as CellItem & { type: "seance_locale" }, semaine, jour)}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#92400e", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>⚡ {item.nom}</p>
                  {item.duree && <p style={{ fontSize: 8, color: "#b45309", margin: "1px 0 0", fontFamily: "system-ui" }}>⏱ {item.duree} min</p>}
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => onEditSeance(item as CellItem & { type: "seance_locale" }, semaine, jour)} style={{ background: "none", border: "none", color: "#b45309", cursor: "pointer", fontSize: 11, padding: "0 3px" }} title="Modifier">✏</button>
                  <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#fcd34d", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
                </div>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", margin: 0, fontFamily: "system-ui" }}>{item.titre}</p>
                    <p style={{ fontSize: 8, color: "#c4b5fd", margin: 0, fontFamily: "system-ui" }}>{item.categorie}</p>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button onClick={() => onEditVideo(item as CellItem & { type: "video" }, semaine, jour)} style={{ background: "none", border: "none", color: "#8B5CF6", cursor: "pointer", fontSize: 11, padding: "0 3px" }} title="Planifier">✏</button>
                    <button onClick={() => onRemove(item._key)} style={{ background: "none", border: "none", color: "#c4b5fd", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
                  </div>
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
    <div style={{ display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "calc(100vh - 80px)", backgroundColor: "#0D0D0D", borderRight: "1px solid #1a1a1a" }}>
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
function ProgrammeGrid({ data, seances, onChange, onCreateSeance, onEditSeance, onEditDbSeance, onEditVideo }: {
  data: ProgrammeData; seances: SeanceRef[];
  onChange: (grid: Grid) => void;
  onCreateSeance: (s: number, j: number) => void;
  onEditSeance: (item: CellItem & { type: "seance_locale" }, semaine: number, jour: number) => void;
  onEditDbSeance: (item: CellItem & { type: "seance" }, semaine: number, jour: number) => void;
  onEditVideo: (item: CellItem & { type: "video" }, semaine: number, jour: number) => void;
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
              onEditSeance={onEditSeance}
              onEditDbSeance={onEditDbSeance}
              onEditVideo={onEditVideo}
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
  // Même précaution que dans SeanceBuilder : `data` est une prop, donc périmée
  // tant que React n'a pas re-rendu. Deux écritures dans le même événement
  // (fréquent : fermer une modale ET modifier la grille) se seraient annulées.
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; });
  const commit = useCallback((next: ProgrammeData) => {
    dataRef.current = next;
    onChange(next);
  }, [onChange]);

  const [seances, setSeances] = useState<SeanceRef[]>([]);
  const [creatorTarget, setCreatorTarget] = useState<{ semaine: number; jour: number } | null>(null);
  const [editTarget, setEditTarget] = useState<{ item: CellItem & { type: "seance_locale" }; semaine: number; jour: number } | null>(null);
  const [dbEditTarget, setDbEditTarget] = useState<{ item: CellItem & { type: "seance" }; semaine: number; jour: number } | null>(null);
  const [videoEditTarget, setVideoEditTarget] = useState<{ item: CellItem & { type: "video" }; semaine: number; jour: number } | null>(null);

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

  const { visibles: totalItems, masques: hiddenItems } = countGridItems(data.grid, data.duree_semaines);

  /** Retire d'une grille tous les items désignés par `match`, sur toutes les
   *  semaines du jour indiqué, et nettoie les cellules devenues vides. */
  function pruneGrid(grid: Grid, jour: number, semaines: number, match: (i: CellItem) => boolean): Grid {
    const next = { ...grid };
    for (let s = 1; s <= semaines; s++) {
      const key = gridKey(s, jour);
      if (!next[key]) continue;
      next[key] = next[key].filter(i => !match(i));
      if (next[key].length === 0) delete next[key];
    }
    return next;
  }

  function handleSeanceSaved(seanceData: SeanceData, selectedWeeks: number[], selectedJour: number) {
    if (!editTarget) return;
    const { item, jour: originalJour } = editTarget;
    const d = dataRef.current;
    // groupId quand il existe : on ne touche qu'aux copies de CETTE séance,
    // jamais aux homonymes. Repli sur le nom pour les programmes existants.
    const groupId = item.groupId ?? nk();
    const newGrid = pruneGrid(d.grid, originalJour, d.duree_semaines, i =>
      i.type === "seance_locale" && (item.groupId
        ? i.groupId === item.groupId
        : i._key === item._key || (!i.groupId && i.nom === item.nom)));
    for (const s of selectedWeeks) {
      const key = gridKey(s, selectedJour);
      newGrid[key] = [...(newGrid[key] ?? []), { _key: nk(), groupId, type: "seance_locale" as const, nom: seanceData.nom, duree: parseInt(seanceData.duree_estimee) || null, seanceData }];
    }
    commit({ ...d, grid: newGrid });
    setEditTarget(null);
  }

  function handleDbSeanceSaved(seanceData: SeanceData, selectedWeeks: number[], selectedJour: number) {
    if (!dbEditTarget) return;
    const { item, jour: originalJour } = dbEditTarget;
    const d = dataRef.current;
    const groupId = nk();
    // Supprimer l'item original (seance DB) de sa cellule d'origine
    const newGrid = pruneGrid(d.grid, originalJour, d.duree_semaines, i => i._key === item._key);
    // Ajouter comme seance_locale aux nouvelles positions
    for (const s of selectedWeeks) {
      const key = gridKey(s, selectedJour);
      newGrid[key] = [...(newGrid[key] ?? []), { _key: nk(), groupId, type: "seance_locale" as const, nom: seanceData.nom, duree: parseInt(seanceData.duree_estimee) || null, seanceData }];
    }
    commit({ ...d, grid: newGrid });
    setDbEditTarget(null);
  }

  function handleVideoSaved(selectedWeeks: number[], selectedJour: number) {
    if (!videoEditTarget) return;
    const { item, jour: originalJour } = videoEditTarget;
    const d = dataRef.current;
    // Supprimer l'item vidéo de sa position d'origine
    const newGrid = pruneGrid(d.grid, originalJour, d.duree_semaines, i => i._key === item._key);
    // Ajouter aux nouvelles positions
    for (const s of selectedWeeks) {
      const key = gridKey(s, selectedJour);
      newGrid[key] = [...(newGrid[key] ?? []), { ...item, _key: nk() }];
    }
    commit({ ...d, grid: newGrid });
    setVideoEditTarget(null);
  }

  function handleSeanceCreated(seanceData: SeanceData, repetitions: number) {
    if (!creatorTarget) return;
    const { semaine, jour } = creatorTarget;
    const d = dataRef.current;
    const newGrid = { ...d.grid };
    const groupId = nk();
    for (let s = semaine; s < semaine + repetitions && s <= d.duree_semaines; s++) {
      const key = gridKey(s, jour);
      newGrid[key] = [...(newGrid[key] ?? []), {
        _key: nk(), groupId, type: "seance_locale" as const,
        nom: seanceData.nom,
        duree: parseInt(seanceData.duree_estimee) || null,
        seanceData,
      }];
    }
    commit({ ...d, grid: newGrid });
    setCreatorTarget(null);
  }

  const jourLabel = creatorTarget
    ? `${JOURS[creatorTarget.jour - 1]} — Semaine ${creatorTarget.semaine}`
    : "";

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", border: "1px solid #1a1a1a", borderRadius: 12, alignItems: "start" }}>
        <SeancesPanel seances={seances} onRefresh={loadSeances} />
        <div style={{ backgroundColor: "#f9f9f9", padding: "14px" }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px", fontFamily: "system-ui" }}>Description</p>
              <input value={data.note} onChange={e => commit({ ...dataRef.current, note: e.target.value })} placeholder="Objectif du programme…"
                style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd", backgroundColor: "#fff", fontSize: 12, fontFamily: "system-ui", outline: "none", minWidth: 240 }} />
            </div>
            <p style={{ fontSize: 11, color: "#aaa", fontFamily: "system-ui", margin: 0 }}>
              {totalItems} élément{totalItems > 1 ? "s" : ""} planifié{totalItems > 1 ? "s" : ""}
            </p>
            {hiddenItems > 0 && (
              <p title="Ces éléments sont conservés : ils réapparaîtront si tu remets la durée d'origine."
                style={{ fontSize: 11, color: "#B22222", fontFamily: "system-ui", margin: 0, cursor: "help" }}>
                ⚠ {hiddenItems} élément{hiddenItems > 1 ? "s" : ""} au-delà de la semaine {data.duree_semaines} (masqué{hiddenItems > 1 ? "s" : ""}, non supprimé{hiddenItems > 1 ? "s" : ""})
              </p>
            )}
          </div>
          <ProgrammeGrid
            data={data} seances={seances}
            onChange={grid => commit({ ...dataRef.current, grid })}
            onCreateSeance={(s, j) => setCreatorTarget({ semaine: s, jour: j })}
            onEditSeance={(item, semaine, jour) => setEditTarget({ item, semaine, jour })}
            onEditDbSeance={(item, semaine, jour) => setDbEditTarget({ item, semaine, jour })}
            onEditVideo={(item, semaine, jour) => setVideoEditTarget({ item, semaine, jour })}
          />
        </div>
      </div>

      {creatorTarget && (
        <InlineSeanceCreator
          jourLabel={jourLabel}
          duree_semaines={data.duree_semaines}
          semaine_debut={creatorTarget?.semaine ?? 1}
          onCreated={handleSeanceCreated}
          onClose={() => setCreatorTarget(null)}
        />
      )}

      {editTarget && (
        <InlineSeanceEditor
          seanceData={editTarget.item.seanceData}
          jourLabel={`${JOURS[editTarget.jour - 1]}`}
          semaine={editTarget.semaine}
          jour={editTarget.jour}
          duree_semaines={data.duree_semaines}
          grid={data.grid}
          itemNom={editTarget.item.nom}
          itemGroupId={editTarget.item.groupId}
          onSaved={handleSeanceSaved}
          onClose={() => setEditTarget(null)}
        />
      )}

      {dbEditTarget && (
        <InlineDbSeanceEditor
          item={dbEditTarget.item}
          semaine={dbEditTarget.semaine}
          jour={dbEditTarget.jour}
          duree_semaines={data.duree_semaines}
          onSaved={handleDbSeanceSaved}
          onClose={() => setDbEditTarget(null)}
        />
      )}

      {videoEditTarget && (
        <InlineVideoPlannerPanel
          item={videoEditTarget.item}
          semaine={videoEditTarget.semaine}
          jour={videoEditTarget.jour}
          duree_semaines={data.duree_semaines}
          onSaved={handleVideoSaved}
          onClose={() => setVideoEditTarget(null)}
        />
      )}
    </>
  );
}
