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
const GROUPES = ["Jambes", "Dos", "Épaules", "Bras", "Abdos", "Poitrine", "Full Body", "Cardio"];
const MATERIELS = ["aucun", "haltères", "barre", "kettlebell", "élastique", "machine", "banc", "TRX"];
const FORMATS = [
  { value: "classique", label: "Classique" },
  { value: "tabata",    label: "Tabata" },
  { value: "emom",      label: "EMOM" },
  { value: "amrap",     label: "AMRAP" },
  { value: "for_time",  label: "For Time" },
];

const GROUPE_COLORS: Record<string, string> = {
  "Jambes": "#3B82F6", "Dos": "#8B5CF6", "Épaules": "#F59E0B",
  "Bras": "#10B981", "Abdos": "#EF4444", "Poitrine": "#F97316",
  "Full Body": "#B22222", "Cardio": "#EC4899",
};

// ─── Utilitaire YouTube ───────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function ytThumb(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// ─── Formulaire par défaut ────────────────────────────────────────────────────
const EMPTY_FORM = {
  nom: "", groupe_musculaire: GROUPES[0], materiel: MATERIELS[0],
  type_format: "classique", description: "", video_url: "", miniature_url: "",
};

// ─── Composant Card ───────────────────────────────────────────────────────────
function ExerciseCard({
  ex, onEdit, onDelete,
}: { ex: Exercise; onEdit: (e: Exercise) => void; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const color = GROUPE_COLORS[ex.groupe_musculaire] ?? "#888";
  const thumb = ex.miniature_url || (ex.video_url ? ytThumb(ex.video_url) : null);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "#fff", borderRadius: 14,
        border: `1px solid ${hovered ? "#e0e0e0" : "#efefef"}`,
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden", transition: "all 0.15s", cursor: "default",
      }}
    >
      {/* Miniature */}
      <div style={{ height: 140, backgroundColor: "#f5f5f5", position: "relative", overflow: "hidden" }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={ex.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 36, opacity: 0.2 }}>🏋️</span>
          </div>
        )}
        {ex.video_url && (
          <a href={ex.video_url} target="_blank" rel="noreferrer" style={{
            position: "absolute", top: 8, right: 8,
            backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6,
            padding: "3px 7px", fontSize: 11, color: "#fff", textDecoration: "none", fontFamily: "system-ui",
          }}>▶ YT</a>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: "14px 14px 12px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px", fontFamily: "system-ui", lineHeight: 1.3 }}>
          {ex.nom}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: `${color}18`, color, border: `1px solid ${color}30`, fontFamily: "system-ui" }}>
            {ex.groupe_musculaire}
          </span>
          {ex.materiel !== "aucun" && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, backgroundColor: "#f5f5f5", color: "#888", fontFamily: "system-ui" }}>
              {ex.materiel}
            </span>
          )}
          {ex.type_format !== "classique" && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: "rgba(178,34,34,0.08)", color: "#B22222", fontFamily: "system-ui" }}>
              {FORMATS.find(f => f.value === ex.type_format)?.label ?? ex.type_format}
            </span>
          )}
        </div>
        {ex.description && (
          <p style={{ fontSize: 11, color: "#999", margin: "0 0 8px", lineHeight: 1.4, fontFamily: "system-ui",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ex.description}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button onClick={() => onEdit(ex)} style={{
            flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid #e8e8e8",
            backgroundColor: "#fafafa", color: "#444", fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "system-ui",
          }}>✏️ Modifier</button>
          <button onClick={() => onDelete(ex.id)} style={{
            padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)",
            backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444", fontSize: 11,
            cursor: "pointer", fontFamily: "system-ui",
          }}>🗑</button>
        </div>
      </div>
    </div>
  );
}

// ─── Panneau latéral Ajout/Modif ──────────────────────────────────────────────
function ExercisePanel({
  exercise, onClose, onSaved,
}: { exercise: Exercise | null; onClose: () => void; onSaved: (ex: Exercise) => void }) {
  const [form, setForm] = useState(exercise
    ? { nom: exercise.nom, groupe_musculaire: exercise.groupe_musculaire, materiel: exercise.materiel,
        type_format: exercise.type_format, description: exercise.description ?? "",
        video_url: exercise.video_url ?? "", miniature_url: exercise.miniature_url ?? "" }
    : { ...EMPTY_FORM });
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
    setError("");
    setSaving(true);
    try {
      const url = exercise ? `/api/coach/exercices/${exercise.id}` : "/api/coach/exercices";
      const method = exercise ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Erreur"); setSaving(false); return; }
      onSaved(data.exercise);
    } catch { setError("Impossible de contacter le serveur."); }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #e0e0e0", backgroundColor: "#fafafa",
    fontSize: 13, color: "#1a1a1a", fontFamily: "system-ui", outline: "none",
    boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#888",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, fontFamily: "system-ui",
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)", zIndex: 50 }} />
      {/* Panneau */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 100vw)", zIndex: 51,
        backgroundColor: "#fff", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {exercise ? "Modifier l'exercice" : "Nouvel exercice"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>

          <div>
            <label style={labelStyle}>Nom de l'exercice *</label>
            <input style={inputStyle} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Squat bulgare" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Groupe musculaire *</label>
              <select style={selectStyle} value={form.groupe_musculaire} onChange={e => setForm(f => ({ ...f, groupe_musculaire: e.target.value }))}>
                {GROUPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Matériel</label>
              <select style={selectStyle} value={form.materiel} onChange={e => setForm(f => ({ ...f, materiel: e.target.value }))}>
                {MATERIELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Format</label>
            <select style={selectStyle} value={form.type_format} onChange={e => setForm(f => ({ ...f, type_format: e.target.value }))}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, height: 80, resize: "vertical" }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Instructions, conseils techniques..."
            />
          </div>

          <div>
            <label style={labelStyle}>Lien YouTube</label>
            <input
              style={inputStyle}
              type="url"
              value={form.video_url}
              onChange={e => handleVideoChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            {preview && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Aperçu" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                <p style={{ fontSize: 10, color: "#aaa", margin: 0, padding: "6px 10px", fontFamily: "system-ui" }}>
                  Miniature générée automatiquement
                </p>
              </div>
            )}
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#EF4444", margin: 0, padding: "8px 12px", backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 8, fontFamily: "system-ui" }}>
              {error}
            </p>
          )}

          {/* Boutons */}
          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: "12px", borderRadius: 9, border: "none",
                backgroundColor: saving ? "#d4595980" : "#B22222", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "system-ui", letterSpacing: "0.03em",
              }}
            >
              {saving ? "Enregistrement…" : "✓ Sauvegarder"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "12px 18px", borderRadius: 9, border: "1px solid #e8e8e8",
                backgroundColor: "#fafafa", color: "#666", fontSize: 14,
                cursor: "pointer", fontFamily: "system-ui",
              }}
            >
              Annuler
            </button>
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

  // Filtres
  const [search, setSearch] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("tous");
  const [filterMateriel, setFilterMateriel] = useState("tous");
  const [filterFormat, setFilterFormat] = useState("tous");

  // Panneau
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/exercices");
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur de chargement"); }
      else setExercises(data.exercises ?? []);
    } catch { setError("Impossible de charger les exercices."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditingExercise(null); setPanelOpen(true); }
  function openEdit(ex: Exercise) { setEditingExercise(ex); setPanelOpen(true); }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet exercice définitivement ?")) return;
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

  // Filtrage
  const filtered = exercises.filter(ex => {
    if (search && !ex.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroupe !== "tous" && ex.groupe_musculaire !== filterGroupe) return false;
    if (filterMateriel !== "tous" && ex.materiel !== filterMateriel) return false;
    if (filterFormat !== "tous" && ex.type_format !== filterFormat) return false;
    return true;
  });

  const filterSelect: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8e8",
    backgroundColor: "#fff", fontSize: 13, color: "#444", cursor: "pointer",
    fontFamily: "system-ui", outline: "none",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
            Portail Coach
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            🏋️ Banque d&apos;exercices
          </h1>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 9, border: "none",
            backgroundColor: "#B22222", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
            boxShadow: "0 2px 8px rgba(178,34,34,0.3)",
          }}
        >
          ➕ Ajouter un exercice
        </button>
      </div>

      {/* Filtres */}
      <div style={{
        backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 12,
        padding: "14px 16px", marginBottom: 20,
        display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
      }}>
        <input
          type="search"
          placeholder="🔍  Rechercher un exercice…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...filterSelect, flex: "1 1 180px", minWidth: 160 }}
        />
        <select style={filterSelect} value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}>
          <option value="tous">Tous les groupes</option>
          {GROUPES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={filterSelect} value={filterMateriel} onChange={e => setFilterMateriel(e.target.value)}>
          <option value="tous">Tout le matériel</option>
          {MATERIELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={filterSelect} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
          <option value="tous">Tous les formats</option>
          {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        {(search || filterGroupe !== "tous" || filterMateriel !== "tous" || filterFormat !== "tous") && (
          <button
            onClick={() => { setSearch(""); setFilterGroupe("tous"); setFilterMateriel("tous"); setFilterFormat("tous"); }}
            style={{ ...filterSelect, color: "#B22222", border: "1px solid rgba(178,34,34,0.3)", cursor: "pointer" }}
          >
            ✕ Reset
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa", fontFamily: "system-ui" }}>
          {filtered.length} exercice{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Setup info si table vide ou erreur */}
      {error && (
        <div style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "#EF4444", margin: "0 0 6px", fontWeight: 700, fontFamily: "system-ui" }}>
            ⚠ Erreur : {error}
          </p>
          <p style={{ fontSize: 12, color: "#999", margin: 0, fontFamily: "system-ui" }}>
            Si la table n'existe pas encore, execute le script <code style={{ backgroundColor: "#f5f5f5", padding: "1px 5px", borderRadius: 4 }}>sql/exercises.sql</code> dans l'éditeur SQL de ton projet Supabase.
          </p>
        </div>
      )}

      {/* Grille */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: 14, color: "#aaa", fontFamily: "system-ui" }}>Chargement…</p>
        </div>
      ) : filtered.length === 0 && !error ? (
        <div style={{
          backgroundColor: "#fff", border: "1px dashed #ddd", borderRadius: 14,
          padding: "60px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>🏋️</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px", fontFamily: "system-ui" }}>
            {exercises.length === 0 ? "Aucun exercice pour l'instant" : "Aucun résultat"}
          </p>
          <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 20px", fontFamily: "system-ui" }}>
            {exercises.length === 0 ? "Commence par ajouter tes premiers exercices." : "Essaie d'autres filtres."}
          </p>
          {exercises.length === 0 && (
            <button onClick={openAdd} style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              backgroundColor: "#B22222", color: "#fff", fontSize: 13,
              fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
            }}>
              ➕ Ajouter un exercice
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} ex={ex} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Panneau latéral */}
      {panelOpen && (
        <ExercisePanel
          exercise={editingExercise}
          onClose={() => setPanelOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
