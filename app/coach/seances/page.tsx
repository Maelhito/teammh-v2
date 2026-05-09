"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, NIVEAUX } from "./SeanceBuilder";

interface Seance {
  id: string;
  nom: string;
  duree_estimee: number | null;
  description: string | null;
  created_at: string;
  exercices_count: number;
}

function parseMeta(description: string | null): { categorie: string; niveau: string } {
  try {
    if (description?.startsWith("{")) {
      const p = JSON.parse(description);
      return { categorie: p.categorie ?? "", niveau: p.niveau ?? "" };
    }
  } catch {}
  return { categorie: "", niveau: "" };
}

function catLabel(v: string) { return CATEGORIES.find(c => c.value === v)?.label ?? v; }
function nivLabel(v: string) { return NIVEAUX.find(n => n.value === v)?.label ?? v; }

function FilterSection({ title, options, active, onChange }: {
  title: string;
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const chip = (value: string, label: string) => (
    <button key={value} onClick={() => onChange(value)} style={{
      padding: "5px 13px", borderRadius: 99, fontSize: 11, cursor: "pointer",
      fontFamily: "system-ui", fontWeight: active === value ? 700 : 400,
      border: active === value ? "1px solid #B22222" : "1px solid #e8e8e8",
      backgroundColor: active === value ? "#B22222" : "#fff",
      color: active === value ? "#fff" : "#666",
      transition: "all 0.12s",
    }}>{label}</button>
  );

  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "none", border: "none", display: "flex", alignItems: "center",
        gap: 6, cursor: "pointer", padding: "2px 0", marginBottom: open ? 8 : 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "system-ui" }}>{title}</span>
        <span style={{ fontSize: 10, color: "#aaa" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chip("tous", "Tous")}
          {options.map(o => chip(o.value, o.label))}
        </div>
      )}
    </div>
  );
}

export default function CoachSeancesPage() {
  const [seances, setSeances] = useState<Seance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("tous");
  const [filterNiv, setFilterNiv] = useState("tous");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/coach/seances");
    const data = await res.json();
    setSeances(data.seances ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Supprimer cette séance définitivement ?")) return;
    await fetch(`/api/coach/seances/${id}`, { method: "DELETE" });
    setSeances(prev => prev.filter(s => s.id !== id));
  }

  const filtered = seances.filter(s => {
    const { categorie, niveau } = parseMeta(s.description);
    if (filterCat !== "tous" && categorie !== filterCat) return false;
    if (filterNiv !== "tous" && niveau !== filterNiv) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Portail Coach</p>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>📋 Mes séances</h1>
        </div>
        <Link href="/coach/seances/nouvelle" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8,
          backgroundColor: "#B22222", color: "#fff", textDecoration: "none",
          fontSize: 13, fontWeight: 700, fontFamily: "system-ui",
          boxShadow: "0 2px 6px rgba(178,34,34,0.25)",
        }}>➕ Créer une séance</Link>
      </div>

      {/* Filtres dépliants */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
        <FilterSection title="Catégorie" options={CATEGORIES} active={filterCat} onChange={setFilterCat} />
        <FilterSection title="Niveau" options={NIVEAUX} active={filterNiv} onChange={setFilterNiv} />
        {(filterCat !== "tous" || filterNiv !== "tous") && (
          <button onClick={() => { setFilterCat("tous"); setFilterNiv("tous"); }}
            style={{ marginTop: 4, background: "none", border: "none", fontSize: 11, color: "#B22222", cursor: "pointer", fontFamily: "system-ui", padding: 0 }}>
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Tableau */}
      {loading ? (
        <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: "#fff", border: "1px dashed #ddd", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 28, margin: "0 0 10px" }}>📋</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "system-ui" }}>
            {seances.length === 0 ? "Aucune séance créée" : "Aucun résultat"}
          </p>
          <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 16px", fontFamily: "system-ui" }}>
            {seances.length === 0 ? "Crée ta première séance." : "Essaie d'autres filtres."}
          </p>
          {seances.length === 0 && (
            <Link href="/coach/seances/nouvelle" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 8, backgroundColor: "#B22222", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: "system-ui" }}>➕ Créer une séance</Link>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", border: "1px solid #efefef", borderRadius: 12, overflow: "hidden" }}>
          {/* En-tête tableau */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 70px 110px", gap: 0, backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0", padding: "8px 16px" }}>
            {["NOM", "CATÉGORIE", "NIVEAU", "EXERCICES", "DURÉE", "ACTIONS"].map(h => (
              <p key={h} style={{ fontSize: 10, fontWeight: 700, color: "#bbb", margin: 0, letterSpacing: "0.07em", fontFamily: "system-ui" }}>{h}</p>
            ))}
          </div>

          {/* Lignes */}
          {filtered.map((s, idx) => {
            const { categorie, niveau } = parseMeta(s.description);
            return (
              <div
                key={s.id}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 70px 110px",
                  gap: 0, padding: "12px 16px", alignItems: "center",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #f5f5f5" : "none",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onClick={() => router.push(`/coach/seances/${s.id}`)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fafafa"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"}
              >
                {/* Nom */}
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>
                  {s.nom}
                </p>

                {/* Catégorie */}
                <span style={{ fontSize: 11, color: "#666", fontFamily: "system-ui" }}>
                  {categorie ? catLabel(categorie) : <span style={{ color: "#ddd" }}>—</span>}
                </span>

                {/* Niveau */}
                {niveau ? (
                  <span style={{
                    display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    fontFamily: "system-ui",
                    color: niveau === "debutant" ? "#10B981" : niveau === "intermediaire" ? "#F59E0B" : "#EF4444",
                    backgroundColor: niveau === "debutant" ? "rgba(16,185,129,0.08)" : niveau === "intermediaire" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                    border: niveau === "debutant" ? "1px solid rgba(16,185,129,0.2)" : niveau === "intermediaire" ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(239,68,68,0.2)",
                  }}>
                    {nivLabel(niveau)}
                  </span>
                ) : <span style={{ fontSize: 11, color: "#ddd" }}>—</span>}

                {/* Exercices */}
                <p style={{ fontSize: 12, color: "#888", margin: 0, fontFamily: "system-ui" }}>
                  {s.exercices_count > 0 ? `${s.exercices_count} ex.` : "—"}
                </p>

                {/* Durée */}
                <p style={{ fontSize: 12, color: "#888", margin: 0, fontFamily: "system-ui" }}>
                  {s.duree_estimee ? `${s.duree_estimee} min` : "—"}
                </p>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <Link href={`/coach/seances/${s.id}`} style={{
                    padding: "5px 10px", borderRadius: 6, border: "1px solid #e8e8e8",
                    backgroundColor: "#fafafa", color: "#555", fontSize: 11,
                    textDecoration: "none", fontFamily: "system-ui", whiteSpace: "nowrap",
                  }}>✏️</Link>
                  <button onClick={e => handleDelete(s.id, e)} style={{
                    padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)",
                    backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444",
                    fontSize: 11, cursor: "pointer", fontFamily: "system-ui",
                  }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compteur */}
      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: "#bbb", margin: "10px 0 0", fontFamily: "system-ui" }}>
          {filtered.length} séance{filtered.length > 1 ? "s" : ""}{(filterCat !== "tous" || filterNiv !== "tous") ? " (filtrées)" : ""}
        </p>
      )}
    </div>
  );
}
