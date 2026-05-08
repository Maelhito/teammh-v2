"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Seance {
  id: string;
  nom: string;
  type_format: string;
  duree_estimee: number | null;
  description: string | null;
  created_at: string;
  exercices_count: number;
}

const FORMATS: Record<string, { label: string; color: string; bg: string }> = {
  classique: { label: "Classique",  color: "#555",    bg: "#f0f0f0" },
  tabata:    { label: "Tabata",     color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  emom:      { label: "EMOM",      color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  amrap:     { label: "AMRAP",     color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
  for_time:  { label: "For Time",  color: "#10B981", bg: "rgba(16,185,129,0.1)" },
};

function FormatBadge({ fmt }: { fmt: string }) {
  const f = FORMATS[fmt] ?? FORMATS.classique;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
      color: f.color, backgroundColor: f.bg,
      border: `1px solid ${f.color}30`, fontFamily: "system-ui",
    }}>
      {f.label}
    </span>
  );
}

export default function CoachSeancesPage() {
  const [seances, setSeances] = useState<Seance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("tous");
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
    if (!confirm("Supprimer cette séance ?")) return;
    await fetch(`/api/coach/seances/${id}`, { method: "DELETE" });
    setSeances((prev) => prev.filter((s) => s.id !== id));
  }

  const filtered = filter === "tous" ? seances : seances.filter((s) => s.type_format === filter);

  const sel: React.CSSProperties = {
    padding: "7px 11px", borderRadius: 7, border: "1px solid #e8e8e8",
    backgroundColor: "#fff", fontSize: 12, color: "#444",
    cursor: "pointer", fontFamily: "system-ui", outline: "none",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>
            Portail Coach
          </p>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            📋 Mes séances
          </h1>
        </div>
        <Link href="/coach/seances/nouvelle" style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", borderRadius: 8,
          backgroundColor: "#B22222", color: "#fff", textDecoration: "none",
          fontSize: 13, fontWeight: 700, fontFamily: "system-ui",
          boxShadow: "0 2px 6px rgba(178,34,34,0.25)",
        }}>
          ➕ Créer une séance
        </Link>
      </div>

      {/* Filtres format */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={() => setFilter("tous")} style={{
          ...sel, fontWeight: filter === "tous" ? 700 : 400,
          backgroundColor: filter === "tous" ? "#1a1a1a" : "#fff",
          color: filter === "tous" ? "#fff" : "#666",
          border: filter === "tous" ? "1px solid #1a1a1a" : "1px solid #e8e8e8",
        }}>Tous</button>
        {Object.entries(FORMATS).map(([key, { label, color }]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            ...sel, fontWeight: filter === key ? 700 : 400,
            backgroundColor: filter === key ? color : "#fff",
            color: filter === key ? "#fff" : "#666",
            border: filter === key ? `1px solid ${color}` : "1px solid #e8e8e8",
          }}>{label}</button>
        ))}
      </div>

      {/* Grille */}
      {loading ? (
        <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{
          backgroundColor: "#fff", border: "1px dashed #ddd", borderRadius: 14,
          padding: "60px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 28, margin: "0 0 10px" }}>📋</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "system-ui" }}>
            {seances.length === 0 ? "Aucune séance créée" : "Aucun résultat"}
          </p>
          <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 18px", fontFamily: "system-ui" }}>
            {seances.length === 0 ? "Crée ta première séance d'entraînement." : "Essaie un autre filtre."}
          </p>
          {seances.length === 0 && (
            <Link href="/coach/seances/nouvelle" style={{
              display: "inline-block", padding: "9px 18px", borderRadius: 8,
              backgroundColor: "#B22222", color: "#fff", textDecoration: "none",
              fontSize: 13, fontWeight: 700, fontFamily: "system-ui",
            }}>➕ Créer une séance</Link>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/coach/seances/${s.id}`)}
              style={{
                backgroundColor: "#fff", borderRadius: 14, border: "1px solid #efefef",
                padding: "18px 18px 14px", cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#e0e0e0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#efefef"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui", lineHeight: 1.3 }}>
                  {s.nom}
                </p>
                <FormatBadge fmt={s.type_format} />
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 13 }}>🏋️</span>
                  <span style={{ fontSize: 12, color: "#888", fontFamily: "system-ui" }}>
                    {s.exercices_count} exercice{s.exercices_count > 1 ? "s" : ""}
                  </span>
                </div>
                {s.duree_estimee && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 13 }}>⏱</span>
                    <span style={{ fontSize: 12, color: "#888", fontFamily: "system-ui" }}>{s.duree_estimee} min</span>
                  </div>
                )}
              </div>

              {s.description && (
                <p style={{
                  fontSize: 11, color: "#aaa", margin: "0 0 12px", lineHeight: 1.4, fontFamily: "system-ui",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {s.description}
                </p>
              )}

              <div style={{ display: "flex", gap: 6, borderTop: "1px solid #f5f5f5", paddingTop: 10 }}>
                <Link
                  href={`/coach/seances/${s.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid #e8e8e8",
                    backgroundColor: "#fafafa", color: "#444", fontSize: 11, fontWeight: 600,
                    textDecoration: "none", textAlign: "center", fontFamily: "system-ui",
                  }}
                >
                  ✏️ Modifier
                </Link>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  style={{
                    padding: "6px 10px", borderRadius: 7,
                    border: "1px solid rgba(239,68,68,0.2)",
                    backgroundColor: "rgba(239,68,68,0.04)", color: "#EF4444",
                    fontSize: 11, cursor: "pointer", fontFamily: "system-ui",
                  }}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
