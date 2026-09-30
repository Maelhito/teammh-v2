/**
 * Questionnaire de démarrage — rempli par la cliente dans le module de démarrage
 * (point 1), avant l'appel de démarrage avec le coach.
 *
 * Les 4 champs d'objectifs sont synchronisés automatiquement vers user_profiles
 * pour apparaître dans le profil de la cliente.
 */

export interface QuestionnaireDemarrage {
  objectif_4mois_poids: string | null;
  objectif_4mois_bienetre: string | null;
  objectif_12mois_poids: string | null;
  objectif_12mois_bienetre: string | null;
  niveau_energie: string | null;
  niveau_sommeil: string | null;
  niveau_confiance: string | null;
  taille_pantalon: string | null;
  freins: string | null;
  aide_accompagnement: string | null;
  sport_actuel: string | null;
  sport_frequence: string | null;
  sport_intensite: string | null;
  sport_duree: string | null;
  douleurs_contreindications: string | null;
  balance: string | null;
  metre_ruban: string | null;
  completed_at?: string | null;
}

/** Champs recopiés dans user_profiles à chaque sauvegarde */
export const OBJECTIF_FIELDS = [
  "objectif_4mois_poids",
  "objectif_4mois_bienetre",
  "objectif_12mois_poids",
  "objectif_12mois_bienetre",
] as const;

export const ALL_FIELDS = [
  ...OBJECTIF_FIELDS,
  "niveau_energie",
  "niveau_sommeil",
  "niveau_confiance",
  "taille_pantalon",
  "freins",
  "aide_accompagnement",
  "sport_actuel",
  "sport_frequence",
  "sport_intensite",
  "sport_duree",
  "douleurs_contreindications",
  "balance",
  "metre_ruban",
] as const;

export type QuestionnaireField = (typeof ALL_FIELDS)[number];

export type FieldKind = "text" | "textarea" | "ouinon" | "note10" | "chiffres" | "cases";

export interface QuestionOption {
  /** valeur enregistrée */
  value: string;
  /** exemples affichés en gris sous la valeur */
  detail?: string;
}

export interface QuestionDef {
  field: QuestionnaireField;
  label: string;
  placeholder?: string;
  kind: FieldKind;
  /** pour "cases" : les choix, l'un sous l'autre */
  options?: QuestionOption[];
  /** pour "chiffres" : de 1 à max */
  max?: number;
  /** question posée seulement si ce champ a cette valeur (ex : le sport si elle répond Oui) */
  siChamp?: { field: QuestionnaireField; vaut: string };
}

export interface QuestionGroup {
  title: string;
  subtitle?: string;
  questions: QuestionDef[];
}

export const QUESTIONNAIRE_GROUPS: QuestionGroup[] = [
  {
    title: "Tes objectifs sur les 4 prochains mois",
    questions: [
      { field: "objectif_4mois_poids", label: "Objectif poids", placeholder: "ex : perdre 5 kg / atteindre 75 kg", kind: "text" },
      { field: "objectif_4mois_bienetre", label: "Objectif bien-être", placeholder: "ex : me sentir plus légère, dormir mieux", kind: "text" },
    ],
  },
  {
    title: "Tes objectifs sur 12 mois",
    questions: [
      { field: "objectif_12mois_poids", label: "Objectif poids", placeholder: "ex : perdre 15 kg et atteindre 60 kg", kind: "text" },
      { field: "objectif_12mois_bienetre", label: "Objectif bien-être", placeholder: "ex : une relation saine avec la nourriture", kind: "text" },
    ],
  },
  {
    title: "Comment tu te sens aujourd'hui",
    questions: [
      { field: "niveau_energie", label: "Quel est ton niveau d'énergie quotidien ? (note sur 10)", kind: "note10" },
      { field: "niveau_sommeil", label: "Quel est ton niveau de sommeil ? (note sur 10)", kind: "note10" },
      { field: "niveau_confiance", label: "Quel est ton niveau de confiance en toi ? (note sur 10)", kind: "note10" },
      { field: "taille_pantalon", label: "Quelle est ta taille de pantalon ?", placeholder: "ex : 38", kind: "text" },
    ],
  },
  {
    title: "Ton accompagnement",
    questions: [
      {
        field: "freins",
        label: "Quels pourraient être les freins possibles à l'atteinte de ton objectif ?",
        placeholder: "temps, motivation, organisation, entourage…",
        kind: "textarea",
      },
      {
        field: "aide_accompagnement",
        label: "Ce qui va le plus t'aider dans l'accompagnement selon toi ?",
        placeholder: "ex : le suivi régulier, les séances guidées, la communauté…",
        kind: "textarea",
      },
    ],
  },
  {
    title: "Sport",
    questions: [
      { field: "sport_actuel", label: "Est-ce que tu fais du sport actuellement ?", kind: "ouinon" },
      {
        field: "sport_frequence",
        label: "Combien de fois par semaine ?",
        kind: "chiffres",
        max: 7,
        siChamp: { field: "sport_actuel", vaut: "oui" },
      },
      {
        field: "sport_intensite",
        label: "Quel sport fais-tu ?",
        kind: "cases",
        options: [
          { value: "Léger", detail: "marche, yoga, étirements, vélo tranquille" },
          { value: "Modéré", detail: "gymnastique, natation, jogging, sport récréatif, renforcement musculaire à la maison" },
          { value: "Intense", detail: "HIIT, crossfit, course à pied, sport de compétition, musculation" },
        ],
        siChamp: { field: "sport_actuel", vaut: "oui" },
      },
      {
        field: "sport_duree",
        label: "Combien de temps durent tes séances ?",
        kind: "cases",
        options: [
          { value: "Moins de 30 minutes" },
          { value: "Entre 30 minutes et 1 heure" },
          { value: "Plus de 1 heure" },
        ],
        siChamp: { field: "sport_actuel", vaut: "oui" },
      },
      {
        field: "douleurs_contreindications",
        label: "As-tu des douleurs ou contre-indications médicales liées au sport ?",
        placeholder: "ex : douleurs au genou droit / aucune",
        kind: "textarea",
      },
      { field: "balance", label: "As-tu une balance ? (pas à aiguilles)", kind: "ouinon" },
      { field: "metre_ruban", label: "As-tu un mètre ruban ?", kind: "ouinon" },
    ],
  },
];

export const EMPTY_QUESTIONNAIRE: QuestionnaireDemarrage = {
  objectif_4mois_poids: null,
  objectif_4mois_bienetre: null,
  objectif_12mois_poids: null,
  objectif_12mois_bienetre: null,
  niveau_energie: null,
  niveau_sommeil: null,
  niveau_confiance: null,
  taille_pantalon: null,
  freins: null,
  aide_accompagnement: null,
  sport_actuel: null,
  sport_frequence: null,
  sport_intensite: null,
  sport_duree: null,
  douleurs_contreindications: null,
  balance: null,
  metre_ruban: null,
  completed_at: null,
};

type Reponses = Partial<Record<QuestionnaireField, string | null>>;

/** « Oui » / « Non » — les anciennes réponses libres (« oui, 2 fois par semaine ») sont reconnues au premier mot */
export function ouiNon(valeur: string | null | undefined): "oui" | "non" | null {
  const v = (valeur ?? "").trim().toLowerCase();
  if (v.startsWith("oui")) return "oui";
  if (v.startsWith("non")) return "non";
  return null;
}

/** La question est-elle posée compte tenu des réponses déjà données ? */
export function questionVisible(q: QuestionDef, reponses: Reponses | null): boolean {
  if (!q.siChamp) return true;
  return ouiNon(reponses?.[q.siChamp.field]) === q.siChamp.vaut;
}

/** Les questions posées : si elle ne fait pas de sport, les détails du sport disparaissent */
export function questionsVisibles(reponses: Reponses | null): QuestionDef[] {
  return QUESTIONNAIRE_GROUPS.flatMap((g) => g.questions).filter((q) => questionVisible(q, reponses));
}

/** Nombre de réponses renseignées / total — pour l'indicateur de progression */
export function countAnswered(q: Reponses | null): number {
  if (!q) return 0;
  return questionsVisibles(q).filter((def) => {
    const v = q[def.field];
    return typeof v === "string" && v.trim() !== "";
  }).length;
}

export function totalQuestions(q: Reponses | null): number {
  return questionsVisibles(q).length;
}

/** Avant d'enregistrer : efface les détails du sport si la réponse n'est pas « Oui » */
export function nettoyerReponsesConditionnelles<T extends Reponses>(reponses: T): T {
  const out = { ...reponses };
  for (const def of QUESTIONNAIRE_GROUPS.flatMap((g) => g.questions)) {
    if (!questionVisible(def, out)) out[def.field] = null as T[QuestionnaireField];
  }
  return out;
}

/** Nombre total de questions existantes (sans tenir compte des conditions) */
export const TOTAL_QUESTIONS = ALL_FIELDS.length;
