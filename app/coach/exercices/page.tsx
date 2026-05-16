"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exercise {
  id: string;
  nom: string;
  groupe_musculaire: string;
  materiel: string;
  type_format: string;
  description: string | null;
  video_url: string | null;
  miniature_url: string | null;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const GROUPES = [
  "Quadriceps", "Ischiojambier", "Mollet", "Fessier", "Abducteur", "Adducteur",
  "Abdominaux", "Biceps", "Triceps", "Pec", "Dos", "Lombaire", "Épaule", "Coeur",
];

const MATERIELS = [
  "aucun", "haltères", "barre", "kettlebell", "élastique",
  "bandes de résistances", "machine", "banc", "TRX",
];

const GROUPE_COLORS: Record<string, string> = {
  "Quadriceps": "#3B82F6", "Ischiojambier": "#8B5CF6", "Mollet": "#0EA5E9",
  "Fessier": "#EC4899", "Abducteur": "#F59E0B", "Adducteur": "#F97316", "Abdominaux": "#EF4444",
  "Biceps": "#10B981", "Triceps": "#06B6D4", "Pec": "#F97316",
  "Dos": "#8B5CF6", "Lombaire": "#84CC16", "Épaule": "#B22222", "Coeur": "#EF4444",
};

// ─── Utilitaire YouTube ───────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function ytThumb(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
function ytEmbed(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
}

const EMPTY_FORM = {
  nom: "", groupe_musculaire: "", materiel: MATERIELS[0],
  description: "", video_url: "", miniature_url: "",
};

// Parse groupes (stockés en virgule-séparés)
function parseGroupes(s: string): string[] {
  return s ? s.split(",").map(g => g.trim()).filter(Boolean) : [];
}
function joinGroupes(gs: string[]): string {
  return gs.join(", ");
}

// ─── Modal vidéo ─────────────────────────────────────────────────────────────
function VideoModal({ url, nom, onClose }: { url: string; nom: string; onClose: () => void }) {
  const embedUrl = ytEmbed(url);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.88)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 780 }}>
        {/* Header modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ color: "#F5F5F0", fontSize: 14, fontWeight: 700, margin: 0, fontFamily: "system-ui" }}>{nom}</p>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6,
            color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 10px", fontFamily: "system-ui",
          }}>✕</button>
        </div>
        {/* Iframe 16/9 */}
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              allow="autoplay; fullscreen"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#888", fontFamily: "system-ui" }}>Lien vidéo non reconnu</p>
            </div>
          )}
        </div>
        <p style={{ color: "#555", fontSize: 11, margin: "8px 0 0", textAlign: "center", fontFamily: "system-ui" }}>
          Clique en dehors pour fermer · Échap pour quitter
        </p>
      </div>
    </div>
  );
}

// ─── Ligne exercice ───────────────────────────────────────────────────────────
function ExerciseRow({
  ex, onEdit, onDelete, onPlay,
}: {
  ex: Exercise;
  onEdit: (e: Exercise) => void;
  onDelete: (id: string) => void;
  onPlay: (ex: Exercise) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = GROUPE_COLORS[ex.groupe_musculaire] ?? "#888";
  const thumb = ex.miniature_url || (ex.video_url ? ytThumb(ex.video_url) : null);
  const hasVideo = !!ex.video_url;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "8px 12px",
        backgroundColor: hovered ? "#f8f8f8" : "#fff",
        borderBottom: "1px solid #f0f0f0",
        transition: "background 0.1s",
      }}
    >
      {/* Miniature cliquable */}
      <div
        onClick={() => hasVideo && onPlay(ex)}
        style={{
          width: 88, height: 56, borderRadius: 7, overflow: "hidden",
          backgroundColor: "#f0f0f0", flexShrink: 0, position: "relative",
          cursor: hasVideo ? "pointer" : "default",
        }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={ex.nom} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, opacity: 0.2 }}>🏋️</span>
          </div>
        )}
        {/* Bouton play overlay */}
        {hasVideo && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundColor: hovered ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10,
            }}>▶</div>
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "system-ui",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ex.nom}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {parseGroupes(ex.groupe_musculaire).map(g => {
            const c = GROUPE_COLORS[g] ?? "#888";
            return (
              <span key={g} style={{
                fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                backgroundColor: `${c}18`, color: c, border: `1px solid ${c}25`,
                fontFamily: "system-ui",
              }}>{g}</span>
            );
          })}
          {!ex.groupe_musculaire && (
            <span style={{ fontSize: 10, color: "#ccc", fontFamily: "system-ui" }}>—</span>
          )}
          {ex.materiel !== "aucun" && (
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, backgroundColor: "#f0f0f0", color: "#888", fontFamily: "system-ui" }}>
              {ex.materiel}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(ex)} style={{
          padding: "5px 10px", borderRadius: 6, border: "1px solid #e8e8e8",
          backgroundColor: "#fafafa", color: "#555", fontSize: 11,
          cursor: "pointer", fontFamily: "system-ui",
        }}>✏️</button>
        <button onClick={() => onDelete(ex.id)} style={{
          padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)",
          backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444", fontSize: 11,
          cursor: "pointer", fontFamily: "system-ui",
        }}>🗑</button>
      </div>
    </div>
  );
}

// ─── Panneau ajout/modif ──────────────────────────────────────────────────────
function ExercisePanel({
  exercise, onClose, onSaved, defaultTypeFormat = "classique",
}: { exercise: Exercise | null; onClose: () => void; onSaved: (ex: Exercise) => void; defaultTypeFormat?: string }) {
  const [form, setForm] = useState(exercise ? {
    nom: exercise.nom, groupe_musculaire: exercise.groupe_musculaire,
    materiel: exercise.materiel, description: exercise.description ?? "",
    video_url: exercise.video_url ?? "", miniature_url: exercise.miniature_url ?? "",
    type_format: exercise.type_format ?? defaultTypeFormat,
  } : { ...EMPTY_FORM, type_format: defaultTypeFormat });

  const selectedGroupes = parseGroupes(form.groupe_musculaire);

  function toggleGroupe(g: string) {
    const current = parseGroupes(form.groupe_musculaire);
    const next = current.includes(g) ? current.filter(x => x !== g) : [...current, g];
    setForm(f => ({ ...f, groupe_musculaire: joinGroupes(next) }));
  }
  const [preview, setPreview] = useState<string | null>(
    exercise?.miniature_url || (exercise?.video_url ? ytThumb(exercise.video_url) : null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleVideoChange(url: string) {
    setForm(f => ({ ...f, video_url: url }));
    const thumb = ytThumb(url);
    setPreview(thumb);
    if (thumb) setForm(f => ({ ...f, miniature_url: thumb }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const url = exercise ? `/api/coach/exercices/${exercise.id}` : "/api/coach/exercices";
      const res = await fetch(url, {
        method: exercise ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Erreur"); setSaving(false); return; }
      onSaved(data.exercise);
    } catch { setError("Impossible de contacter le serveur."); }
    setSaving(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 11px", borderRadius: 8,
    border: "1px solid #e0e0e0", backgroundColor: "#fafafa",
    fontSize: 13, color: "#1a1a1a", fontFamily: "system-ui",
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#888",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4, fontFamily: "system-ui",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.2)", zIndex: 50 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)", zIndex: 51,
        backgroundColor: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {exercise ? "Modifier" : "Nouvel exercice"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <div>
            <label style={lbl}>Nom *</label>
            <input style={inp} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Squat bulgare" required />
          </div>

          <div>
            <label style={lbl}>
              Groupes musculaires *
              {selectedGroupes.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10, color: "#B22222", fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>
                  {selectedGroupes.length} sélectionné{selectedGroupes.length > 1 ? "s" : ""}
                </span>
              )}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {GROUPES.map(g => {
                const c = GROUPE_COLORS[g] ?? "#888";
                const active = selectedGroupes.includes(g);
                return (
                  <button key={g} type="button" onClick={() => toggleGroupe(g)}
                    style={{
                      padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "system-ui", border: `1.5px solid ${active ? c : "#e0e0e0"}`,
                      backgroundColor: active ? `${c}18` : "#fafafa",
                      color: active ? c : "#aaa",
                      transition: "all 0.12s",
                    }}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={lbl}>Matériel</label>
            <select style={{ ...inp, cursor: "pointer" }} value={form.materiel} onChange={e => setForm(f => ({ ...f, materiel: e.target.value }))}>
              {MATERIELS.map(m => <option key={m} value={m}>{m === "aucun" ? "Aucun" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, height: 72, resize: "vertical" }} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions, conseils..." />
          </div>

          <div>
            <label style={lbl}>Lien YouTube</label>
            <input style={inp} type="url" value={form.video_url} onChange={e => handleVideoChange(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            {preview && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Aperçu" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                <p style={{ fontSize: 10, color: "#aaa", margin: 0, padding: "5px 10px", fontFamily: "system-ui" }}>Miniature générée automatiquement</p>
              </div>
            )}
          </div>

          {/* Toggle échauffement */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", backgroundColor: form.type_format === "echauffement" ? "rgba(249,115,22,0.06)" : "#fafafa", borderRadius: 8, border: `1px solid ${form.type_format === "echauffement" ? "rgba(249,115,22,0.3)" : "#e8e8e8"}` }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: form.type_format === "echauffement" ? "#F97316" : "#1a1a1a", margin: "0 0 2px", fontFamily: "system-ui" }}>
                🔥 Exercice d'échauffement
              </p>
              <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>Apparaîtra dans la banque d'échauffements</p>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, type_format: f.type_format === "echauffement" ? "classique" : "echauffement" }))}
              style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", backgroundColor: form.type_format === "echauffement" ? "#F97316" : "#e0e0e0", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff", transition: "left 0.2s", left: form.type_format === "echauffement" ? 22 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </button>
          </div>

          {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0, padding: "7px 10px", backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 8, fontFamily: "system-ui" }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: "11px", borderRadius: 8, border: "none",
              backgroundColor: saving ? "#ccc" : "#B22222", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "system-ui",
            }}>
              {saving ? "Enregistrement…" : "✓ Sauvegarder"}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: "11px 16px", borderRadius: 8, border: "1px solid #e8e8e8",
              backgroundColor: "#fafafa", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "system-ui",
            }}>Annuler</button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CoachExercicesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("tous");
  const [filterMateriel, setFilterMateriel] = useState("tous");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [videoEx, setVideoEx] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<"exercices" | "echauffements">("exercices");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/exercices");
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Erreur");
      else setExercises(data.exercises ?? []);
    } catch { setError("Impossible de charger les exercices."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet exercice ?")) return;
    await fetch(`/api/coach/exercices/${id}`, { method: "DELETE" });
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  function handleSaved(ex: Exercise) {
    setExercises(prev => {
      const idx = prev.findIndex(e => e.id === ex.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = ex; return next; }
      return [ex, ...prev];
    });
    setPanelOpen(false);
  }

  const filtered = exercises.filter(ex => {
    // Filtre par onglet
    if (activeTab === "echauffements" && ex.type_format !== "echauffement") return false;
    if (activeTab === "exercices" && ex.type_format === "echauffement") return false;
    // Filtres texte / groupe / matériel
    if (search && !ex.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroupe !== "tous" && !parseGroupes(ex.groupe_musculaire).includes(filterGroupe)) return false;
    if (filterMateriel !== "tous" && ex.materiel !== filterMateriel) return false;
    return true;
  });

  const sel: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 7, border: "1px solid #e8e8e8",
    backgroundColor: "#fff", fontSize: 12, color: "#444",
    cursor: "pointer", fontFamily: "system-ui", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>
            Portail Coach
          </p>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {activeTab === "exercices" ? "🏋️ Banque d'exercices" : "🔥 Banque d'échauffements"}
          </h1>
        </div>
        <button onClick={() => { setEditing(null); setPanelOpen(true); }} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 8, border: "none",
          backgroundColor: "#B22222", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
          boxShadow: "0 2px 6px rgba(178,34,34,0.25)",
        }}>
          ➕ Ajouter
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, backgroundColor: "#f4f4f4", borderRadius: 10, padding: 4 }}>
        {([
          { key: "exercices",     label: "🏋️ Exercices",      count: exercises.filter(e => e.type_format !== "echauffement").length },
          { key: "echauffements", label: "🔥 Échauffements",   count: exercises.filter(e => e.type_format === "echauffement").length },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(""); setFilterGroupe("tous"); setFilterMateriel("tous"); }}
            style={{
              flex: 1, padding: "8px 14px", borderRadius: 7, border: "none", cursor: "pointer",
              fontFamily: "system-ui", fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400,
              backgroundColor: activeTab === tab.key ? "#fff" : "transparent",
              color: activeTab === tab.key ? "#B22222" : "#888",
              boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {tab.label}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99, backgroundColor: activeTab === tab.key ? "#B2222218" : "#e8e8e8", color: activeTab === tab.key ? "#B22222" : "#aaa" }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{
        backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 10,
        padding: "10px 12px", marginBottom: 12,
        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
      }}>
        <input
          type="search" placeholder="🔍  Rechercher…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...sel, flex: "1 1 150px", minWidth: 130 }}
        />
        <select style={sel} value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}>
          <option value="tous">Tous les groupes</option>
          {GROUPES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={sel} value={filterMateriel} onChange={e => setFilterMateriel(e.target.value)}>
          <option value="tous">Tout le matériel</option>
          {MATERIELS.map(m => <option key={m} value={m}>{m === "aucun" ? "Aucun" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        {(search || filterGroupe !== "tous" || filterMateriel !== "tous") && (
          <button onClick={() => { setSearch(""); setFilterGroupe("tous"); setFilterMateriel("tous"); }}
            style={{ ...sel, color: "#B22222", border: "1px solid rgba(178,34,34,0.3)" }}>
            ✕ Reset
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#bbb", fontFamily: "system-ui", whiteSpace: "nowrap" }}>
          {filtered.length} exercice{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Erreur / setup */}
      {error && (
        <div style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: "#EF4444", margin: "0 0 4px", fontWeight: 700, fontFamily: "system-ui" }}>⚠ {error}</p>
          <p style={{ fontSize: 11, color: "#999", margin: 0, fontFamily: "system-ui" }}>
            Si la table n'existe pas, exécute <code style={{ backgroundColor: "#f5f5f5", padding: "1px 4px", borderRadius: 3 }}>sql/exercises.sql</code> dans l'éditeur SQL Supabase.
          </p>
        </div>
      )}

      {/* Liste */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 10, overflow: "hidden", flex: 1 }}>
        {/* En-tête colonne */}
        <div style={{
          display: "grid", gridTemplateColumns: "88px 1fr auto",
          gap: 12, padding: "7px 12px",
          backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#bbb", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "system-ui" }}>Vidéo</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#bbb", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "system-ui" }}>Exercice</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#bbb", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "system-ui" }}>Actions</p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "50px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 28, margin: "0 0 10px" }}>{activeTab === "echauffements" ? "🔥" : "🏋️"}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "system-ui" }}>
              {filtered.length === 0 && search === "" && filterGroupe === "tous" && filterMateriel === "tous"
                ? activeTab === "echauffements" ? "Aucun échauffement pour l'instant" : "Aucun exercice pour l'instant"
                : "Aucun résultat"}
            </p>
            <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 16px", fontFamily: "system-ui" }}>
              {filtered.length === 0 && search === "" && filterGroupe === "tous" && filterMateriel === "tous"
                ? activeTab === "echauffements" ? "Ajoute des exercices et active le toggle Échauffement." : "Commence par ajouter tes premiers exercices."
                : "Essaie d'autres filtres."}
            </p>
            {exercises.length === 0 && (
              <button onClick={() => { setEditing(null); setPanelOpen(true); }} style={{
                padding: "9px 18px", borderRadius: 7, border: "none",
                backgroundColor: "#B22222", color: "#fff", fontSize: 13,
                fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              }}>➕ Ajouter un exercice</button>
            )}
          </div>
        ) : (
          filtered.map(ex => (
            <ExerciseRow
              key={ex.id} ex={ex}
              onEdit={e => { setEditing(e); setPanelOpen(true); }}
              onDelete={handleDelete}
              onPlay={setVideoEx}
            />
          ))
        )}
      </div>

      {/* Panneau ajout/modif */}
      {panelOpen && (
        <ExercisePanel
          exercise={editing}
          defaultTypeFormat={activeTab === "echauffements" ? "echauffement" : "classique"}
          onClose={() => setPanelOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Modal vidéo */}
      {videoEx && videoEx.video_url && (
        <VideoModal url={videoEx.video_url} nom={videoEx.nom} onClose={() => setVideoEx(null)} />
      )}
    </div>
  );
}
