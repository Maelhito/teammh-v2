"use client";

import { useState } from "react";
import { ttsColors } from "@/lib/tts-theme";

const JOURS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "M" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

export default function TtsJoursEntrainement({ initialJours }: { initialJours: number[] }) {
  const [jours, setJours] = useState(new Set(initialJours));
  const [saving, setSaving] = useState(false);

  async function toggle(value: number) {
    const next = new Set(jours);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setJours(next);

    setSaving(true);
    try {
      await fetch("/api/tts/jours-entrainement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jours: [...next] }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: ttsColors.card, border: `1px solid ${ttsColors.cardBorder}`, borderRadius: 16, padding: "14px 18px", marginTop: 12 }}>
      <p className="font-body" style={{ margin: "0 0 10px", color: ttsColors.muted, fontSize: 12 }}>
        Tes jours d&apos;entraînement {saving && "· ..."}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {JOURS.map((j) => {
          const active = jours.has(j.value);
          return (
            <button
              key={j.value}
              onClick={() => toggle(j.value)}
              className="font-body"
              style={{
                flex: 1,
                aspectRatio: "1",
                borderRadius: 10,
                border: `1px solid ${active ? ttsColors.red : ttsColors.cardBorder}`,
                background: active ? ttsColors.red : "transparent",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {j.label}
            </button>
          );
        })}
      </div>
      <p className="font-body" style={{ margin: "10px 0 0", color: ttsColors.muted, fontSize: 11 }}>
        On te rappelle le matin de ces jours-là.
      </p>
    </div>
  );
}
