import type { SerieInfo } from "@/lib/serie";

/**
 * La série de la cliente, présentée comme un jeu : la flamme, les jokers qui
 * protègent la série, et les paliers à décrocher. Volontairement compact —
 * c'est un encart de dashboard, pas une page.
 */
export default function SerieCard({ serie }: { serie: SerieInfo }) {
  const { serie: n, totalValidees, jokers, jokersUtilises, seanceDuJourEnAttente, paliers, prochainPalier } = serie;
  const obtenus = paliers.filter((p) => p.obtenu).length;

  // Rien à raconter tant qu'aucune séance n'a été validée
  if (totalValidees === 0 && n === 0) {
    return (
      <div style={{ padding: "8px 16px" }}>
        <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 16px" }}>
          <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", margin: 0 }}>
            MA SÉRIE
          </p>
          <p className="font-body" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#F5F5F0", margin: "4px 0 0" }}>
            Valide ta première séance pour allumer la flamme 🔥
          </p>
          <p className="font-body" style={{ fontSize: "0.72rem", color: "#6B7280", margin: "3px 0 0" }}>
            Chaque séance prévue que tu fais fait monter ta série. En rater une la remet à zéro.
          </p>
        </div>
      </div>
    );
  }

  const messageEtat = n === 0
    ? "Ta série est repartie de zéro — la prochaine séance la relance."
    : seanceDuJourEnAttente
      ? "Ta séance du jour est en attente : fais-la pour garder ta série."
      : `Tu enchaînes sans en rater une. ${jokers > 0 ? "Tes jokers sont en réserve." : "Plus de joker : ne rate rien."}`;

  return (
    <div style={{ padding: "8px 16px" }}>
      <div style={{ backgroundColor: "#111111", border: `1px solid ${n > 0 ? "rgba(178,34,34,0.4)" : "#1a1a1a"}`, borderRadius: 14, padding: "14px 16px" }}>
        {/* En-tête : titre + jokers */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <p className="font-body" style={{ fontSize: "0.63rem", fontWeight: 700, color: "#555", letterSpacing: "0.08em", margin: 0, flex: 1 }}>
            MA SÉRIE
          </p>
          <span
            className="font-body"
            title="Un joker absorbe une séance manquée sans casser ta série. Tu en gagnes un toutes les 5 séances enchaînées."
            style={{ fontSize: "0.63rem", fontWeight: 700, color: jokers > 0 ? "#F5F5F0" : "#444", flexShrink: 0 }}
          >
            🛡 {jokers} joker{jokers > 1 ? "s" : ""}
          </span>
        </div>

        {/* La flamme */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>🔥</span>
          <span className="font-title" style={{ fontSize: "1.9rem", color: "#F5F5F0", lineHeight: 1 }}>{n}</span>
          <span className="font-body" style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
            séance{n > 1 ? "s" : ""} d&apos;affilée
          </span>
        </div>

        <p className="font-body" style={{ fontSize: "0.72rem", color: "#6B7280", margin: "6px 0 0" }}>
          {messageEtat}
        </p>

        {jokersUtilises > 0 && (
          <p className="font-body" style={{ fontSize: "0.68rem", color: "#4B5563", margin: "3px 0 0" }}>
            🛡 {jokersUtilises} joker{jokersUtilises > 1 ? "s" : ""} {jokersUtilises > 1 ? "ont" : "a"} déjà sauvé ta série.
          </p>
        )}

        {/* Prochain palier */}
        {prochainPalier && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1a1a1a" }}>
            <p className="font-body" style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: 0 }}>
              Prochain palier {prochainPalier.emoji}{" "}
              <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{prochainPalier.label}</span>
              <span style={{ color: "#6B7280" }}>
                {" "}— encore {prochainPalier.restant}{" "}
                {prochainPalier.mesure === "serie" ? "sans en rater" : `séance${prochainPalier.restant > 1 ? "s" : ""}`}
              </span>
            </p>
          </div>
        )}

        {/* Paliers : obtenus en couleur, à venir en grisé */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {paliers.map((p) => (
            <span
              key={`${p.mesure}-${p.seuil}`}
              title={`${p.label}${p.obtenu ? " — obtenu" : ` — encore ${p.restant}`}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
                padding: "3px 8px", borderRadius: 99,
                border: `1px solid ${p.obtenu ? "rgba(178,34,34,0.45)" : "#1a1a1a"}`,
                backgroundColor: p.obtenu ? "rgba(178,34,34,0.14)" : "#0D0D0D",
                fontSize: "0.63rem", fontWeight: 700,
                color: p.obtenu ? "#F5F5F0" : "#3f3f3f",
                filter: p.obtenu ? undefined : "grayscale(1)",
              }}
            >
              {p.emoji} {p.seuil}
            </span>
          ))}
          <span className="font-body" style={{ fontSize: "0.63rem", color: "#4B5563", flexShrink: 0, marginLeft: 2 }}>
            {obtenus}/{paliers.length}
          </span>
        </div>
      </div>
    </div>
  );
}
