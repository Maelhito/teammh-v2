"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, NIVEAUX } from "../seances/SeanceBuilder";

interface Programme {
  id: string;
  nom: string;
  categorie: string;
  niveau: string;
  duree_semaines: number;
  description: string | null;
  created_at: string;
}

function catLabel(v: string) { return CATEGORIES.find(c => c.value === v)?.label ?? v; }
function nivLabel(v: string) { return NIVEAUX.find(n => n.value === v)?.label ?? v; }

function countSeances(description: string | null): number {
  try {
    if (!description?.startsWith("{")) return 0;
    const p = JSON.parse(description);
    return Object.values(p.grid ?? {}).reduce((a: number, ids) => a + (ids as string[]).length, 0);
  } catch { return 0; }
}

const NIV_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  debutant:      { color: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)"  },
  intermediaire: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  avance:        { color: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
};

function FilterDropdown({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  const active = value !== "tous";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: active ? "#B22222" : "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui" }}>{label}</span>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          appearance: "none", WebkitAppearance: "none", width: "100%",
          padding: "10px 36px 10px 14px", borderRadius: 8, cursor: "pointer",
          fontFamily: "system-ui", fontSize: 13, fontWeight: active ? 700 : 400,
          border: active ? "2px solid #B22222" : "1px solid #ddd",
          backgroundColor: active ? "rgba(178,34,34,0.04)" : "#fff",
          color: active ? "#B22222" : "#555", outline: "none", boxSizing: "border-box",
          boxShadow: active ? "0 1px 6px rgba(178,34,34,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <option value="tous">Tous</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: active ? "#B22222" : "#bbb", pointerEvents: "none" }}>▼</span>
      </div>
    </div>
  );
}

export default function CoachProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCat, setFilterCat] = useState("tous");
  const [filterNiv, setFilterNiv] = useState("tous");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/coach/programmes");
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Erreur de chargement");
    else setProgrammes(data.programmes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Supprimer ce programme définitivement ?")) return;
    await fetch(`/api/coach/programmes/${id}`, { method: "DELETE" });
    setProgrammes(prev => prev.filter(p => p.id !== id));
  }

  const filtered = programmes.filter(p => {
    if (filterCat !== "tous" && p.categorie !== filterCat) return false;
    if (filterNiv !== "tous" && p.niveau !== filterNiv) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Portail Coach</p>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>📅 Mes programmes</h1>
        </div>
        <Link href="/coach/programmes/nouveau" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8,
          backgroundColor: "#B22222", color: "#fff", textDecoration: "none",
          fontSize: 13, fontWeight: 700, fontFamily: "system-ui",
          boxShadow: "0 2px 6px rgba(178,34,34,0.25)",
        }}>➕ Créer un programme</Link>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 180px", maxWidth: 240 }}>
          <FilterDropdown label="Catégorie" options={CATEGORIES} value={filterCat} onChange={setFilterCat} />
        </div>
        <div style={{ flex: "1 1 180px", maxWidth: 240 }}>
          <FilterDropdown label="Niveau" options={NIVEAUX} value={filterNiv} onChange={setFilterNiv} />
        </div>
        {(filterCat !== "tous" || filterNiv !== "tous") && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={() => { setFilterCat("tous"); setFilterNiv("tous"); }}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#fafafa", fontSize: 12, color: "#999", cursor: "pointer", fontFamily: "system-ui" }}>
              ✕ Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Erreur setup */}
      {error && (
        <div style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "#EF4444", margin: "0 0 4px", fontWeight: 700, fontFamily: "system-ui" }}>⚠ {error}</p>
          <p style={{ fontSize: 11, color: "#999", margin: 0, fontFamily: "system-ui" }}>Exécute <code style={{ backgroundColor: "#f5f5f5", padding: "1px 4px", borderRadius: 3 }}>sql/programmes.sql</code> dans l'éditeur SQL Supabase.</p>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: "#fff", border: "1px dashed #ddd", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 28, margin: "0 0 10px" }}>📅</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "system-ui" }}>
            {programmes.length === 0 ? "Aucun programme créé" : "Aucun résultat"}
          </p>
          <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 16px", fontFamily: "system-ui" }}>
            {programmes.length === 0 ? "Crée ton premier programme d'entraînement." : "Essaie d'autres filtres."}
          </p>
          {programmes.length === 0 && (
            <Link href="/coach/programmes/nouveau" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 8, backgroundColor: "#B22222", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: "system-ui" }}>➕ Créer un programme</Link>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px 80px 110px", gap: 0, backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0", padding: "8px 16px" }}>
            {["NOM", "CATÉGORIE", "NIVEAU", "DURÉE", "SEMAINES", "SÉANCES", "ACTIONS"].map(h => (
              <p key={h} style={{ fontSize: 10, fontWeight: 700, color: "#bbb", margin: 0, letterSpacing: "0.07em", fontFamily: "system-ui" }}>{h}</p>
            ))}
          </div>

          {filtered.map((p, idx) => {
            const niv = NIV_COLORS[p.niveau];
            const nbSeances = countSeances(p.description);
            return (
              <div key={p.id}
                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px 80px 110px", gap: 0, padding: "12px 16px", alignItems: "center", borderBottom: idx < filtered.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer", transition: "background 0.1s" }}
                onClick={() => router.push(`/coach/programmes/${p.id}`)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fafafa"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>{p.nom}</p>
                <span style={{ fontSize: 11, color: "#666", fontFamily: "system-ui" }}>{p.categorie ? catLabel(p.categorie) : "—"}</span>
                {niv ? (
                  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: niv.color, backgroundColor: niv.bg, border: `1px solid ${niv.border}`, fontFamily: "system-ui" }}>
                    {nivLabel(p.niveau)}
                  </span>
                ) : <span style={{ color: "#ddd", fontSize: 11 }}>—</span>}
                <p style={{ fontSize: 12, color: "#888", margin: 0, fontFamily: "system-ui" }}>{p.duree_semaines ? `${p.duree_semaines} sem.` : "—"}</p>
                <p style={{ fontSize: 12, color: "#888", margin: 0, fontFamily: "system-ui" }}>{p.duree_semaines ? `${p.duree_semaines * 7} j.` : "—"}</p>
                <p style={{ fontSize: 12, color: nbSeances > 0 ? "#1a1a1a" : "#ddd", fontWeight: nbSeances > 0 ? 700 : 400, margin: 0, fontFamily: "system-ui" }}>{nbSeances > 0 ? nbSeances : "—"}</p>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <Link href={`/coach/programmes/${p.id}`} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e8e8e8", backgroundColor: "#fafafa", color: "#555", fontSize: 11, textDecoration: "none", fontFamily: "system-ui" }}>✏️</Link>
                  <button onClick={e => handleDelete(p.id, e)} style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444", fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: "#bbb", margin: "10px 0 0", fontFamily: "system-ui" }}>
          {filtered.length} programme{filtered.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
