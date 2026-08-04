"use client";

import { useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";

const JOURS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "M" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

export default function TtlJoursEntrainement({ initialJours }: { initialJours: number[] }) {
  const [jours, setJours] = useState(new Set(initialJours));
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(initialJours.length > 0);

  function toggle(value: number) {
    if (validated) return;
    const next = new Set(jours);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setJours(next);
  }

  async function valider() {
    setSaving(true);
    try {
      await fetch("/api/ttl/jours-entrainement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jours: [...jours] }),
      });
      setValidated(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 16, padding: "14px 18px", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p className="font-body" style={{ margin: 0, color: ttlColors.muted, fontSize: 12 }}>
          Tes jours d&apos;entraînement
        </p>
        {validated ? (
          <button
            onClick={() => setValidated(false)}
            className="font-body"
            style={{ background: "transparent", border: "none", color: ttlColors.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
          >
            Modifier
          </button>
        ) : (
          <button
            onClick={valider}
            disabled={saving || jours.size === 0}
            className="font-body"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${ttlColors.redBright}`,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.3px",
              padding: "5px 9px",
              borderRadius: 8,
              cursor: jours.size === 0 ? "default" : "pointer",
              opacity: jours.size === 0 ? 0.4 : 1,
            }}
          >
            {saving ? "..." : "Valider"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {JOURS.map((j) => {
          const active = jours.has(j.value);
          return (
            <button
              key={j.value}
              onClick={() => toggle(j.value)}
              disabled={validated}
              className="font-body"
              style={{
                flex: 1,
                aspectRatio: "1",
                borderRadius: 10,
                border: `1px solid ${active ? ttlColors.redBright : ttlColors.cardBorder}`,
                background: active ? (validated ? "rgba(255,255,255,0.06)" : ttlColors.red) : "transparent",
                color: validated && active ? ttlColors.muted : "#fff",
                opacity: validated && !active ? 0.35 : 1,
                fontSize: 13,
                fontWeight: 700,
                cursor: validated ? "default" : "pointer",
              }}
            >
              {j.label}
            </button>
          );
        })}
      </div>
      <p className="font-body" style={{ margin: "10px 0 0", color: ttlColors.muted, fontSize: 11 }}>
        {validated ? "Jours validés · on te rappelle le matin de ces jours-là." : "Sélectionne tes jours puis valide."}
      </p>
    </div>
  );
}
