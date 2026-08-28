import { COULEURS_EVENEMENT, ORDRE_LEGENDE } from "@/lib/couleurs-calendrier";

/**
 * Le code couleur des calendriers côté cliente — la même légende que celle du
 * coach, sur fond sombre.
 *
 * Les couleurs viennent de `lib/couleurs-calendrier` : la légende ne peut donc
 * pas dériver de ce que les cases affichent réellement.
 */
export default function LegendeCalendrier({ compact = false }: { compact?: boolean }) {
  const pastille = compact ? 6 : 8;
  const texte = compact ? "0.62rem" : "0.72rem";

  return (
    <div style={{ display: "flex", gap: compact ? 8 : 10, flexWrap: "wrap", alignItems: "center" }}>
      {ORDRE_LEGENDE.map((type) => (
        <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: pastille, height: pastille, borderRadius: "50%", backgroundColor: COULEURS_EVENEMENT[type].base, display: "inline-block", flexShrink: 0 }} />
          <span className="font-body" style={{ fontSize: texte, color: "#9CA3AF" }}>{COULEURS_EVENEMENT[type].label}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: texte, lineHeight: 1, color: COULEURS_EVENEMENT.seance.base, fontWeight: 900 }}>✓</span>
        <span className="font-body" style={{ fontSize: texte, color: "#9CA3AF" }}>Séance validée</span>
      </div>
    </div>
  );
}
