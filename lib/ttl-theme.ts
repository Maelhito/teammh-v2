/**
 * Couleurs de l'app Time To Live.
 *
 * Les couleurs qui changent entre le mode nuit et le mode jour sont des variables
 * CSS (définies dans app/globals.css) : la cliente choisit son mode dans son profil,
 * l'attribut `data-ttl-theme="light"` est posé sur <html> et toutes les pages
 * suivent, y compris celles rendues côté serveur. Le rouge de la marque, lui, ne
 * change pas : un texte blanc sur un bouton rouge reste en `#fff`.
 */
export const ttlColors = {
  bg: "var(--ttl-bg)",
  card: "var(--ttl-card)",
  cardBorder: "var(--ttl-card-border)",
  /** Blocs un cran plus sombres que les cartes en mode nuit (questionnaire, vidéos). */
  surface: "var(--ttl-surface)",
  surfaceBorder: "var(--ttl-surface-border)",
  red: "#B22222",
  redDark: "#7A1515",
  redBright: "var(--ttl-red-bright)",
  /** Texte principal : blanc la nuit, presque noir le jour. */
  text: "var(--ttl-text)",
  offWhite: "var(--ttl-off-white)",
  /** Texte secondaire un peu plus doux que le principal (libellés, rappels). */
  textSoft: "var(--ttl-text-soft)",
  muted: "var(--ttl-muted)",
  green: "var(--ttl-green)",
  error: "var(--ttl-error)",
  ice: "var(--ttl-ice)",
  /** Pastilles posées sur le fond (offre, objectif, série). */
  chip: "var(--ttl-chip)",
  chipBorder: "var(--ttl-chip-border)",
  /** Voile léger pour un élément « déjà fait ». */
  veil: "var(--ttl-veil)",
};

export const ttlHeaderGradient = `linear-gradient(135deg, ${ttlColors.red} 0%, ${ttlColors.redDark} 100%)`;

export type TtlTheme = "dark" | "light";
export const TTL_THEME_KEY = "ttl-theme";

/** Lu avant l'affichage de la page : évite un flash noir pour une cliente en mode jour. */
export const ttlThemeScript = `try{if(localStorage.getItem("${TTL_THEME_KEY}")==="light")document.documentElement.setAttribute("data-ttl-theme","light")}catch(e){}`;
