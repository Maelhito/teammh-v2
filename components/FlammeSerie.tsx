"use client";

import { useState } from "react";

interface FlammeSerieProps {
  /** séances prévues validées d'affilée */
  serie: number;
  /** jokers en réserve — un joker absorbe une séance manquée */
  jokers: number;
}

/**
 * La flamme du tableau de bord : elle EST la série, c'est-à-dire le nombre de
 * séances prévues validées d'affilée.
 *
 * Elle se tapote pour afficher la règle du jeu. Une infobulle `title` ne
 * suffisait pas : sur téléphone — c'est-à-dire pour toutes les clientes — le
 * survol n'existe pas, donc l'explication n'apparaissait jamais.
 */
export default function FlammeSerie({ serie, jokers }: FlammeSerieProps) {
  const [ouvert, setOuvert] = useState(false);
  const allumee = serie > 0;

  const titre = allumee
    ? `${serie} séance${serie > 1 ? "s" : ""} d'affilée`
    : "Ta flamme est éteinte";

  const explication = allumee
    ? "Chaque séance prévue que tu valides fait monter ta flamme. En rater une la remet à zéro."
    : "Valide ta prochaine séance prévue pour l'allumer. Ensuite, chaque séance enchaînée la fait monter.";

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          backgroundColor: allumee ? "#1a0000" : "#111111",
          border: `1px solid ${allumee ? "rgba(178,34,34,0.45)" : "#1a1a1a"}`,
          borderRadius: 22, padding: "5px 12px",
          cursor: "pointer", appearance: "none",
        }}
      >
        <span style={{ fontSize: "1.15rem", lineHeight: 1, filter: allumee ? undefined : "grayscale(1)", opacity: allumee ? 1 : 0.45 }}>
          🔥
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 2 }}>
          <span className="font-title" style={{ fontSize: "1.05rem", color: allumee ? "#F5F5F0" : "#444", lineHeight: 1 }}>
            {serie}
          </span>
          <span className="font-body" style={{ fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", color: allumee ? "rgba(245,245,240,0.5)" : "#333" }}>
            D&apos;AFFILÉE
          </span>
        </span>
      </button>

      {ouvert && (
        <>
          {/* Tapoter à côté referme */}
          <div
            onClick={() => setOuvert(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 41,
              width: 230, backgroundColor: "#111111",
              border: `1px solid ${allumee ? "rgba(178,34,34,0.4)" : "#1a1a1a"}`,
              borderRadius: 12, padding: "10px 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <p className="font-body" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#F5F5F0", margin: 0 }}>
              {titre}
            </p>
            <p className="font-body" style={{ fontSize: "0.7rem", color: "#6B7280", margin: "4px 0 0", lineHeight: 1.35 }}>
              {explication}
            </p>
            <p className="font-body" style={{ fontSize: "0.68rem", color: jokers > 0 ? "#9CA3AF" : "#4B5563", margin: "6px 0 0" }}>
              🛡 {jokers} joker{jokers > 1 ? "s" : ""} —{" "}
              {jokers > 0
                ? `${jokers > 1 ? "ils encaissent" : "il encaisse"} une séance manquée sans casser ta flamme.`
                : "tu en gagnes un toutes les 5 séances enchaînées."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
