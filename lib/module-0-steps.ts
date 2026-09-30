/**
 * Les points du module de démarrage (module-0).
 *
 * La complétion de chaque point est stockée dans module_completions avec le slug
 * préfixé (`module-0:presentation`, …), pour ne pas se mélanger avec la complétion
 * du module lui-même.
 */

export interface Module0Step {
  /** identifiant court, utilisé dans l'URL : /modules/module-0/<key> */
  key: string;
  index: number;
  title: string;
  category: string;
  /** vide = pas de durée affichée */
  duration: string;
  emoji: string;
  /** "content" = vidéos dans l'app · "external" = lien vers un site externe */
  type: "content" | "external";
  description: string;
  /** affiche le questionnaire de démarrage sous le contenu */
  hasQuestionnaire?: boolean;
  /** vidéos utilisées tant qu'aucune vidéo n'est configurée en admin : [lien, titre] */
  defaultVideos?: [string, string][];
  /** affiche le texte d'accueil sur la prise de poids et de mensurations */
  hasMensurations?: boolean;
}

export const MODULE_0_STEPS: Module0Step[] = [
  {
    key: "presentation",
    index: 1,
    title: "Vidéo de présentation",
    category: "Introduction",
    duration: "",
    emoji: "🎬",
    type: "content",
    description: "Bienvenue chez Time To Move : découvre ton programme, puis fais le point avec le questionnaire.",
    hasQuestionnaire: true,
  },
  {
    key: "mensurations",
    index: 2,
    title: "Poids et mensurations",
    category: "Suivi",
    duration: "",
    emoji: "📏",
    type: "content",
    description: "Avant ton appel de démarrage, prends ton poids et tes mensurations : ce sont tes points de départ.",
    // Même vidéo que « Démarrer ton sport » (vidéo 3)
    defaultVideos: [["https://youtube.com/shorts/C6p_pTGqDBo", "Comment rentrer mes mensurations"]],
    hasMensurations: true,
  },
  {
    key: "plan-alimentaire",
    index: 3,
    title: "Présentation plan alimentaire",
    category: "Nutrition",
    duration: "",
    emoji: "🥗",
    type: "content",
    description: "Comprends comment fonctionne ton plan alimentaire avant de le mettre en place.",
  },
  {
    key: "questionnaire",
    index: 4,
    title: "Questionnaire alimentaire",
    category: "Questionnaire",
    duration: "",
    emoji: "📝",
    type: "external",
    description: "Remplis ton questionnaire alimentaire pour que ton coach prépare ton plan.",
  },
];

/** Slug de complétion stocké en base pour une étape donnée */
export function stepCompletionSlug(key: string): string {
  return `module-0:${key}`;
}

export function getModule0Step(key: string): Module0Step | undefined {
  return MODULE_0_STEPS.find((s) => s.key === key);
}
