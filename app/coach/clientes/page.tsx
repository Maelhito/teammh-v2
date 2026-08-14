"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Cliente {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  statut: string;
  date_demarrage: string | null;
}

const STATUT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  active:   { color: "#10B981", bg: "rgba(16,185,129,0.08)",  label: "Active"   },
  pause:    { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  label: "En pause" },
  terminee: { color: "#9CA3AF", bg: "rgba(156,163,175,0.08)", label: "Terminée" },
};

function initiales(c: Cliente) {
  const p = c.prenom?.[0] ?? "";
  const n = c.nom?.[0] ?? "";
  return (p + n).toUpperCase() || c.email[0].toUpperCase();
}

function displayName(c: Cliente) {
  if (c.prenom || c.nom) return [c.prenom, c.nom].filter(Boolean).join(" ");
  return c.email;
}

export default function CoachClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/coach/clientes");
    const data = await res.json();
    setClientes(data.clientes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clientes.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.prenom?.toLowerCase() ?? "").includes(q) ||
      (c.nom?.toLowerCase() ?? "").includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, color: "#999", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 2px", fontFamily: "system-ui" }}>Portail Coach</p>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>👥 Mes clientes</h1>
        </div>
        <input
          type="search" placeholder="🔍 Rechercher…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: "system-ui", outline: "none", minWidth: 220 }}
        />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#bbb", fontFamily: "system-ui" }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: "#fff", border: "1px dashed #ddd", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 28, margin: "0 0 10px" }}>👥</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
            {clientes.length === 0 ? "Aucune cliente" : "Aucun résultat"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(c => {
            const st = STATUT_STYLE[c.statut] ?? STATUT_STYLE.active;
            return (
              <div key={c.id}
                onClick={() => router.push(`/coach/clientes/${c.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", backgroundColor: "#fff", borderRadius: 12, border: "1px solid #efefef", cursor: "pointer", transition: "box-shadow 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#B22222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "system-ui" }}>{initiales(c)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>{displayName(c)}</p>
                  <p style={{ fontSize: 11, color: "#aaa", margin: 0, fontFamily: "system-ui" }}>{c.email}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: st.color, backgroundColor: st.bg, fontFamily: "system-ui", flexShrink: 0 }}>
                  {st.label}
                </span>
                <span style={{ fontSize: 18, color: "#ddd" }}>›</span>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: "#bbb", margin: "10px 0 0", fontFamily: "system-ui" }}>
          {filtered.length} cliente{filtered.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
