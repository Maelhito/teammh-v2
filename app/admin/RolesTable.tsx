"use client";

import { useState, useEffect } from "react";

interface UserRow {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  coach: "Coach",
  admin: "Admin",
};

export default function RolesTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    setSaving(userId);
    await fetch("/api/admin/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    setSaving(null);
  }

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0, color: "#F5F5F0" }}>
          👥 GESTION DES ACCÈS
        </h2>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#555" }}>Chargement…</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #1A1A1A" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#111111" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                {["PRÉNOM", "NOM", "EMAIL", "RÔLE"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: "0.05em", textAlign: "left", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #1A1A1A" }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#F5F5F0" }}>{u.prenom || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#F5F5F0" }}>{u.nom || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{u.email}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <select
                      value={u.role}
                      disabled={saving === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{
                        backgroundColor: "#0D0D0D",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 6, padding: "5px 10px",
                        color: u.role === "coach" ? "#3B82F6" : u.role === "admin" ? "#B22222" : "#F5F5F0",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none",
                        opacity: saving === u.id ? 0.5 : 1,
                      }}
                    >
                      {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val} style={{ backgroundColor: "#1A1A1A" }}>{lbl}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
