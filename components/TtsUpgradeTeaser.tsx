"use client";

import { useState } from "react";
import { ttsColors } from "@/lib/tts-theme";

interface Props {
  title: string;
  subtitle: string;
  unlocked?: boolean;
  lockedHint?: string;
}

export default function TtsUpgradeTeaser({ title, subtitle, unlocked = true, lockedHint }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");

  async function handleRequest() {
    setState("loading");
    try {
      const res = await fetch("/api/tts/demande-bilan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: title }),
      });
      setState(res.ok ? "sent" : "idle");
    } catch {
      setState("idle");
    }
  }

  if (!unlocked) {
    return (
      <div
        style={{
          background: ttsColors.card,
          border: `1px dashed ${ttsColors.cardBorder}`,
          borderRadius: 18,
          padding: 18,
          marginTop: 12,
          opacity: 0.85,
        }}
      >
        <p className="font-body" style={{ color: ttsColors.muted, fontSize: 11, fontWeight: 700, letterSpacing: "1px", margin: 0 }}>
          🔒 RÉCOMPENSE À DÉBLOQUER
        </p>
        <h3 className="font-body" style={{ color: "#fff", fontSize: 16, margin: "6px 0 4px", fontWeight: 700 }}>{title}</h3>
        <p className="font-body" style={{ color: ttsColors.muted, fontSize: "12.5px", margin: 0, lineHeight: 1.4 }}>
          {lockedHint ?? subtitle}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: `${ttsColors.card} radial-gradient(circle at top right, rgba(230,57,70,0.2), transparent 60%)`,
        border: `1px solid ${ttsColors.redBright}`,
        borderRadius: 18,
        padding: 18,
        marginTop: 12,
      }}
    >
      <p className="font-body" style={{ color: ttsColors.redBright, fontSize: 11, fontWeight: 700, letterSpacing: "1px", margin: 0 }}>
        🎁 RÉCOMPENSE DÉBLOQUÉE
      </p>
      <h3 className="font-body" style={{ color: "#fff", fontSize: 16, margin: "6px 0 4px", fontWeight: 700 }}>{title}</h3>
      <p className="font-body" style={{ color: ttsColors.muted, fontSize: "12.5px", margin: "0 0 14px", lineHeight: 1.4 }}>{subtitle}</p>

      {state === "sent" ? (
        <div
          className="font-body"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, color: ttsColors.green, fontSize: 13, fontWeight: 700 }}
        >
          ✓ Demande envoyée, ton coach te recontacte vite
        </div>
      ) : (
        <button
          onClick={handleRequest}
          disabled={state === "loading"}
          className="font-body"
          style={{ width: "100%", padding: "12px 0", background: state === "loading" ? ttsColors.cardBorder : ttsColors.red, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: state === "loading" ? "not-allowed" : "pointer" }}
        >
          {state === "loading" ? "..." : "Demander mon bilan"}
        </button>
      )}
    </div>
  );
}
