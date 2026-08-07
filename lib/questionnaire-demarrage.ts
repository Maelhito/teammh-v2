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
  freins: string | null;
  aide_accompagnement: string | null;
  sport_actuel: string | null;
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
  "freins",
  "aide_accompagnement",
  "sport_actuel",
  "douleurs_contreindications",
  "balance",
  "metre_ruban",
] as const;

export type QuestionnaireField = (typeof ALL_FIELDS)[number];

export type FieldKind = "text" | "textarea" | "ouinon";

export interface QuestionDef {
  field: QuestionnaireField;
  label: string;
  placeholder?: string;
  kind: FieldKind;
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
      { field: "objectif_4mois_poids", label: "Objectif poids", placeholder: "ex : perdre 5 kg", kind: "text" },
      { field: "objectif_4mois_bienetre", label: "Objectif bien-être", placeholder: "ex : me sentir plus légère, dormir mieux", kind: "text" },
    ],
  },
  {
    title: "Tes objectifs sur 12 mois",
    questions: [
      { field: "objectif_12mois_poids", label: "Objectif poids", placeholder: "ex : atteindre mon poids de forme", kind: "text" },
      { field: "objectif_12mois_bienetre", label: "Objectif bien-être", placeholder: "ex : une relation saine avec la nourriture", kind: "text" },
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
      { field: "sport_actuel", label: "Est-ce que tu fais du sport actuellement ?", placeholder: "ex : oui, 2 fois par semaine / non", kind: "textarea" },
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
  freins: null,
  aide_accompagnement: null,
  sport_actuel: null,
  douleurs_contreindications: null,
  balance: null,
  metre_ruban: null,
  completed_at: null,
};

/** Nombre de réponses renseignées / total — pour l'indicateur de progression */
export function countAnswered(q: Partial<QuestionnaireDemarrage> | null): number {
  if (!q) return 0;
  return ALL_FIELDS.filter((f) => {
    const v = q[f];
    return typeof v === "string" && v.trim() !== "";
  }).length;
}

export const TOTAL_QUESTIONS = ALL_FIELDS.length;
