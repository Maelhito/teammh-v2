"use client";

import { useEffect, useState } from "react";
import { ttlColors, ttlHeaderGradient } from "@/lib/ttl-theme";

interface Props {
  firstName: string;
  objectifLabel: string | null;
}

export default function TtlWelcomePopup({ firstName, objectifLabel }: Props) {
  const flagKey = "ttl_show_welcome_new";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(flagKey)) {
      localStorage.removeItem(flagKey);
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 380, width: "100%", background: ttlColors.card, border: `1px solid ${ttlColors.cardBorder}`, borderRadius: 20, overflow: "hidden", textAlign: "center" }}>
        <div style={{ background: ttlHeaderGradient, padding: "32px 24px" }}>
          <p style={{ fontSize: 44, margin: 0 }}>🔥</p>
          <h2 className="font-body" style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "10px 0 0", letterSpacing: "0.03em" }}>
            Bienvenue, {firstName} !
          </h2>
        </div>
        <div style={{ padding: "22px 24px 26px" }}>
          <p className="font-body" style={{ color: "#fff", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {objectifLabel
              ? <>Ton objectif : <b style={{ color: ttlColors.redBright }}>{objectifLabel}</b>. On te donne les premières clés dès maintenant.</>
              : "On te donne les premières clés dès maintenant."}
          </p>
          <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13, margin: "10px 0 20px" }}>
            Onboarding, séances, recettes, capsules motivation — tout est là pour t'aider à démarrer du bon pied.
          </p>
          <button
            onClick={() => setVisible(false)}
            className="font-body"
            style={{ width: "100%", padding: "14px 0", background: ttlColors.red, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer" }}
          >
            C'EST PARTI 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
