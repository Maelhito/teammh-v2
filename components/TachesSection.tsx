"use client";

import { useState, useEffect } from "react";

interface Tache {
  id: string;
  titre: string;
  message: string | null;
  done: boolean;
}

export default function TachesSection() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/taches")
      .then((r) => r.json())
      .then((d) => setTaches(d.taches ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(id: string, currentDone: boolean) {
    setToggling(id);
    // Optimistic update
    setTaches((prev) => prev.map((t) => t.id === id ? { ...t, done: !currentDone } : t));
    try {
      await fetch("/api/taches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id, done: !currentDone }),
      });
    } catch {
      // Revert on error
      setTaches((prev) => prev.map((t) => t.id === id ? { ...t, done: currentDone } : t));
    } finally {
      setToggling(null);
    }
  }

  if (loading) return null;

  const count = taches.length;
  const doneCount = taches.filter((t) => t.done).length;

  // Bloc compact si 0 tâches
  if (count === 0) {
    return (
      <div style={{ padding: "0 16px 4px" }}>
        <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="font-body" style={{ fontSize: "0.75rem", color: "#333" }}>Aucune tâche cette semaine</span>
        </div>
      </div>
    );
  }

  // Toutes validées → encart compact
  if (count > 0 && doneCount === count) {
    return (
      <div style={{ padding: "0 16px 4px" }}>
        <div style={{ backgroundColor: "#111111", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 14, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.9rem" }}>✅</span>
          <span className="font-body" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ADE80", letterSpacing: "0.04em" }}>
            Tout fait cette semaine !
          </span>
          <span className="font-body" style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#4ADE80", opacity: 0.6 }}>
            {count}/{count}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 4px" }}>
      <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 18px" }}>
        {/* Compteur + barre de progression */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 10 }}>
          <span
            className="font-body"
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: doneCount === count ? "#FB923C" : "#B22222",
              backgroundColor: doneCount === count ? "rgba(251,146,60,0.1)" : "rgba(178,34,34,0.1)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {doneCount}/{count}
          </span>
        </div>

        {/* Barre de progression */}
        <div style={{ height: 3, backgroundColor: "#1a1a1a", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${count > 0 ? (doneCount / count) * 100 : 0}%`,
              backgroundColor: doneCount === count ? "#4ADE80" : "#B22222",
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Liste des tâches */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {taches.map((tache) => (
            <button
              key={tache.id}
              onClick={() => toggle(tache.id, tache.done)}
              disabled={toggling === tache.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
                opacity: toggling === tache.id ? 0.6 : 1,
              }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${tache.done ? "#4ADE80" : "#2a2a2a"}`,
                  backgroundColor: tache.done ? "rgba(74,222,128,0.15)" : "transparent",
                  flexShrink: 0,
                  marginTop: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                {tache.done && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>
              {/* Texte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="font-body"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: tache.done ? "#444" : "#F5F5F0",
                    margin: 0,
                    lineHeight: 1.3,
                    textDecoration: tache.done ? "line-through" : "none",
                    transition: "color 0.15s ease",
                  }}
                >
                  {tache.titre}
                </p>
                {tache.message && !tache.done && (
                  <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", margin: "2px 0 0", lineHeight: 1.4 }}>
                    {tache.message}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Message si tout coché */}
        {doneCount === count && count > 0 && (
          <div style={{ marginTop: 14, padding: "10px 14px", backgroundColor: "rgba(74,222,128,0.08)", borderRadius: 10, border: "1px solid rgba(74,222,128,0.15)" }}>
            <p className="font-body" style={{ fontSize: "0.78rem", color: "#4ADE80", fontWeight: 600, margin: 0, textAlign: "center" }}>
              ✓ Toutes les tâches complétées 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
