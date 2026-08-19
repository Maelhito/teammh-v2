/**
 * Couleurs des calendriers — source unique.
 *
 * Les quatre calendriers de l'app (cliente, fiche coach, calendrier admin, vue
 * semaine admin) importent CE fichier et rien d'autre. Avant, chacun avait sa
 * propre liste : le coaching de groupe était bleu ici et violet là, les séances
 * grises dans l'admin. Toute couleur d'événement ajoutée ailleurs redeviendrait
 * une divergence — elle doit passer par ici.
 *
 * Deux règles ont guidé le choix des teintes :
 *  · le rouge #B22222 est la couleur de l'app : il ne désigne aucun type
 *    d'événement, il ne marque plus que le jour courant ;
 *  · deux types ne doivent jamais se ressembler sur une pastille de 5 px.
 *    L'écart perceptuel minimal de cette palette est de 34 (il était de 14).
 */

export type TypeEvenement =
  | "seance"
  | "coach"
  | "nutrition"
  | "coaching_groupe"
  | "tache"
  | "perso";

export interface TeinteEvenement {
  /** Couleur pleine : pastilles, points, bordures. */
  base: string;
  /**
   * Même teinte, éclaircie pour rester lisible SUR FOND SOMBRE. `base` y perd
   * du contraste (3,8 contre 7,6 pour le bleu des séances).
   */
  clair: string;
  /** Fond très clair, pour les blocs d'événement sur surface blanche. */
  fond: string;
  /** Texte lisible sur `fond`. */
  texte: string;
  label: string;
}

export const COULEURS_EVENEMENT: Record<TypeEvenement, TeinteEvenement> = {
  seance:          { base: "#2563EB", clair: "#60A5FA", fond: "#DBEAFE", texte: "#1E40AF", label: "Séance" },
  coach:           { base: "#EA580C", clair: "#FB923C", fond: "#FFEDD5", texte: "#9A3412", label: "Rendez-vous coach" },
  nutrition:       { base: "#16A34A", clair: "#4ADE80", fond: "#DCFCE7", texte: "#166534", label: "Nutrition" },
  coaching_groupe: { base: "#7C3AED", clair: "#A78BFA", fond: "#EDE9FE", texte: "#5B21B6", label: "Coaching de groupe" },
  tache:           { base: "#DB2777", clair: "#F472B6", fond: "#FCE7F3", texte: "#9D174D", label: "Tâche" },
  perso:           { base: "#64748B", clair: "#94A3B8", fond: "#F1F5F9", texte: "#334155", label: "Événement perso" },
};

/**
 * Contenu vidéo posé dans un programme. Ce n'est pas un événement, mais ça
 * s'affiche dans les mêmes cases de calendrier : la teinte est donc choisie à
 * distance de toute la palette ci-dessus (écart minimal 37).
 */
export const COULEUR_VIDEO = "#A16207";

/** Rouge de l'app : réservé au jour courant, jamais à un type d'événement. */
export const COULEUR_AUJOURDHUI = "#B22222";

/** Repli quand le type est inconnu ou absent (ancien événement sans type). */
export const COULEUR_INCONNUE = COULEURS_EVENEMENT.perso.base;

/**
 * Séance validée. Côté cliente, c'est le bleu des séances plus une coche : c'est
 * la même séance dans un autre état. Côté coach, où il faut repérer d'un coup
 * d'œil ce qui a été fait dans un mois entier, elle prend un contour vert — le
 * vert du « c'est fait ».
 *
 * Cette teinte est aussi celle de la nutrition. Le risque de confusion est
 * écarté par la forme : la nutrition est une pastille ronde, la séance validée
 * un bloc rectangulaire cerclé, portant une coche et le nom de la séance.
 */
export const COULEUR_SEANCE_VALIDEE = COULEURS_EVENEMENT.nutrition.base;

export const SEANCE_VALIDEE_COCHE = "✓";

function estType(v: string | null | undefined): v is TypeEvenement {
  return !!v && v in COULEURS_EVENEMENT;
}

/** Couleur pleine d'un événement. `perso` couvre les événements créés par la cliente. */
export function couleurEvenement(
  eventType: string | null | undefined,
  creePar?: string | null
): string {
  if (estType(eventType)) return COULEURS_EVENEMENT[eventType].base;
  if (creePar === "cliente") return COULEURS_EVENEMENT.perso.base;
  return COULEUR_INCONNUE;
}

/** Trio fond / bordure / texte, pour les blocs d'événement du dashboard coach. */
export function teinteEvenement(
  eventType: string | null | undefined,
  creePar?: string | null
): TeinteEvenement {
  if (estType(eventType)) return COULEURS_EVENEMENT[eventType];
  if (creePar === "cliente") return COULEURS_EVENEMENT.perso;
  return COULEURS_EVENEMENT.perso;
}

/** Libellé d'un type, pour les légendes et les fiches d'événement. */
export function labelEvenement(eventType: string | null | undefined): string {
  return estType(eventType) ? COULEURS_EVENEMENT[eventType].label : "Événement";
}

/** Ordre d'affichage dans les légendes : du plus fréquent au plus rare. */
export const ORDRE_LEGENDE: TypeEvenement[] = [
  "seance",
  "coach",
  "nutrition",
  "coaching_groupe",
  "tache",
  "perso",
];

/**
 * Couleurs d'identification des programmes assignés à une cliente.
 *
 * Elles ne colorent PLUS rien dans les calendriers : une séance est bleue,
 * qu'elle vienne d'un programme ou d'un autre, côté coach comme côté cliente.
 * Elles ne servent qu'à distinguer les cartes de programme sous le calendrier
 * (liseré et barre de progression). Elles restent malgré tout tenues à distance
 * de la palette d'événements, pour ne jamais évoquer un type d'événement.
 */
export const COULEURS_PROGRAMME = [
  "#E236D1",
  "#F59E0B",
  "#84CC16",
  "#9646B9",
  "#14B8A6",
  "#9B8427",
];

export function couleurProgramme(index: number): string {
  return COULEURS_PROGRAMME[index % COULEURS_PROGRAMME.length];
}

/**
 * Types d'événement qui sont un vrai rendez-vous : ils ont lieu à une heure
 * précise, et la cliente doit la lire sans avoir à demander. Les tâches et les
 * séances n'ont pas d'heure — elles se font dans la journée.
 *
 * C'est cette liste qui rend le champ « Heure » obligatoire à la création, côté
 * coach comme côté admin, et qui déclenche l'affichage de l'heure côté cliente.
 */
export const TYPES_RENDEZ_VOUS: TypeEvenement[] = ["coach", "nutrition", "coaching_groupe"];

export function estRendezVous(eventType: string | null | undefined): boolean {
  return !!eventType && (TYPES_RENDEZ_VOUS as string[]).includes(eventType);
}

/** "10:00:00" → "10:00". Une heure absente reste absente (jamais "00:00"). */
export function formatHeureCourte(heure: string | null | undefined): string | null {
  if (!heure) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(heure);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
