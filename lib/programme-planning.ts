// Utilitaires partagés pour la planification des programmes d'une cliente.
//
// Une cliente peut avoir PLUSIEURS programmes "en_cours" en même temps : le coach
// peut ainsi programmer à l'avance (ex. un programme qui démarre dans 4 semaines
// pendant qu'un autre est en cours). Chaque assignation porte sa propre date de
// début et sa propre grille ; c'est la date de début qui décide du jour réel de
// chaque case `S{semaine}_J{jour}`.

export interface ProgrammeTemplateRow {
  id?: string;
  nom?: string | null;
  niveau?: string | null;
  duree_semaines?: number | null;
  description?: string | null;
}

export interface AssignmentRow {
  id: string;
  date_debut: string | null;
  grid_data: string | null;
  statut?: string | null;
  seances_effectuees?: number | null;
  /** supabase-js type la jointure tantôt en objet, tantôt en tableau */
  programme?: ProgrammeTemplateRow | ProgrammeTemplateRow[] | null;
}

function templateDe(row: AssignmentRow): ProgrammeTemplateRow | null {
  const p = row.programme;
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export interface DecodedProgramme {
  /** id de l'assignation (client_programmes.id), pas du template */
  id: string;
  nom: string;
  niveau: string;
  date_debut: string | null;
  /**
   * Durée retenue pour CETTE cliente (peut être plus courte que celle du
   * template). Elle borne la fenêtre du programme : les semaines au-delà sont
   * masquées partout, sans être supprimées de la grille — remettre la durée
   * d'origine les fait réapparaître.
   */
  duree_semaines: number;
  note: string;
  grid: Record<string, unknown[]>;
  seancesTerminees: string[];
  tachesDone: string[];
}

/** Parse "YYYY-MM-DD" en date locale (évite le décalage UTC de `new Date(str)`). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function safeParse(src: string | null | undefined): Record<string, unknown> {
  if (!src || !src.startsWith("{")) return {};
  try {
    return JSON.parse(src) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Normalise une ligne `client_programmes` (+ son template) en programme exploitable. */
export function decodeAssignment(row: AssignmentRow): DecodedProgramme {
  const template = templateDe(row);
  const fromGrid = safeParse(row.grid_data);
  const fromTemplate = safeParse(template?.description ?? null);

  // grid_data est la copie personnalisée pour cette cliente ; on retombe sur le
  // template tant qu'aucune grille n'y a été enregistrée.
  const grid =
    (fromGrid.grid as Record<string, unknown[]> | undefined) ??
    (fromTemplate.grid as Record<string, unknown[]> | undefined) ??
    {};

  // La durée de l'assignation prime sur celle du template : le coach peut
  // raccourcir un programme de 4 semaines à 2 pour une cliente donnée sans
  // toucher au programme d'origine.
  const duree_semaines =
    (fromGrid.duree_semaines as number | undefined) ??
    template?.duree_semaines ??
    (fromTemplate.duree_semaines as number | undefined) ??
    4;

  return {
    id: row.id,
    nom: template?.nom ?? "Mon programme",
    niveau: template?.niveau ?? "",
    date_debut: row.date_debut,
    duree_semaines,
    note: (fromGrid.note as string | undefined) ?? (fromTemplate.note as string | undefined) ?? "",
    grid,
    seancesTerminees: Array.isArray(fromGrid.seances_terminees) ? (fromGrid.seances_terminees as string[]) : [],
    tachesDone: Array.isArray(fromGrid.taches_done) ? (fromGrid.taches_done as string[]) : [],
  };
}

/** Décode et trie par date de début croissante (le plus ancien d'abord). */
export function decodeAssignments(rows: AssignmentRow[] | null | undefined): DecodedProgramme[] {
  return (rows ?? [])
    .map(decodeAssignment)
    .sort((a, b) => (a.date_debut ?? "").localeCompare(b.date_debut ?? ""));
}

/**
 * Clé de grille (`S{semaine}_J{jour}`) correspondant à `date` pour un programme
 * démarré le `dateDebut`. Renvoie null si la date est hors de la fenêtre du
 * programme — c'est ce qui permet à plusieurs programmes de cohabiter sans se
 * marcher dessus.
 */
export function dateToGridKey(date: Date, dateDebut: Date, dureeSemaines?: number): string | null {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(dateDebut);
  start.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0) return null;

  const semaine = Math.floor(diffDays / 7) + 1;
  if (dureeSemaines && semaine > dureeSemaines) return null;

  const jour = ((d.getDay() + 6) % 7) + 1; // 1 = lundi … 7 = dimanche
  return `S${semaine}_J${jour}`;
}

/**
 * Date réelle d'une case de grille — inverse exact de `dateToGridKey`.
 *
 * Le jour d'une case est un jour de SEMAINE (J1 = lundi), pas un décalage
 * depuis la date de début. On prend donc, dans la fenêtre de 7 jours de la
 * semaine visée, la date qui tombe le bon jour. Pour un programme démarré un
 * mercredi, S1_J1 (lundi) tombe ainsi le lundi SUIVANT le début, exactement
 * comme `dateToGridKey` le calcule dans l'autre sens.
 *
 * L'implémentation précédente ajoutait bêtement (jour - 1) jours à la date de
 * début : juste pour un départ le lundi, décalée sinon.
 */
export function gridKeyToDate(key: string, dateDebut: Date): Date | null {
  const m = key.match(/^S(\d+)_J(\d+)$/);
  if (!m) return null;

  const semaine = parseInt(m[1]);
  const jour = parseInt(m[2]);
  if (!semaine || jour < 1 || jour > 7) return null;

  const d = new Date(dateDebut);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (semaine - 1) * 7);

  const jourDeD = ((d.getDay() + 6) % 7) + 1; // 1 = lundi … 7 = dimanche
  d.setDate(d.getDate() + ((jour - jourDeD + 7) % 7));
  return d;
}

/** Clé de grille d'un programme pour la date du jour, ou null hors fenêtre. */
export function gridKeyFor(programme: DecodedProgramme, date: Date): string | null {
  if (!programme.date_debut) return null;
  return dateToGridKey(date, parseLocalDate(programme.date_debut), programme.duree_semaines);
}

/** Numéro de semaine d'une clé `S{n}_J{j}` (0 si la clé est invalide). */
export function semaineDeCle(key: string): number {
  return parseInt(key.match(/^S(\d+)_J\d+$/)?.[1] ?? "0");
}

/** Jour (1-7) d'une clé `S{n}_J{j}` (0 si la clé est invalide). */
export function jourDeCle(key: string): number {
  return parseInt(key.match(/^S\d+_J(\d+)$/)?.[1] ?? "0");
}

/** Les jours de la semaine (1-7) occupés par la grille, triés. */
export function joursDeLaGrille(grid: Record<string, unknown[]>): number[] {
  const jours = new Set<number>();
  for (const [key, items] of Object.entries(grid)) {
    const j = jourDeCle(key);
    if (j > 0 && (items ?? []).length) jours.add(j);
  }
  return [...jours].sort((a, b) => a - b);
}

/**
 * Mapping "jour source → jour cible" appliqué à une grille.
 * Un jour source ABSENT du mapping voit ses séances retirées : c'est ainsi
 * qu'on passe un programme de 3 séances/semaine à 2 pour une cliente.
 */
export type MappingJours = Record<number, number>;

/** Mapping neutre : chaque jour reste à sa place. */
export function mappingIdentite(jours: number[]): MappingJours {
  return Object.fromEntries(jours.map((j) => [j, j]));
}

/**
 * Ré-agence une grille selon un mapping de jours. Ne touche jamais au template :
 * la grille passée est toujours la copie personnalisée de la cliente.
 */
export function adapterGrille<T>(
  grid: Record<string, T[]>,
  mapping: MappingJours,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const [key, items] of Object.entries(grid)) {
    const semaine = semaineDeCle(key);
    const jour = jourDeCle(key);
    if (!semaine || !jour) continue;

    const jourCible = mapping[jour];
    if (jourCible === undefined) continue; // séance retirée pour cette cliente

    const nouvelleCle = `S${semaine}_J${jourCible}`;
    out[nouvelleCle] = [...(out[nouvelleCle] ?? []), ...(items ?? [])];
  }
  return out;
}

/** Applique le même mapping à une liste de clés (ex. `seances_terminees`). */
export function adapterCles(cles: string[], mapping: MappingJours): string[] {
  const out = new Set<string>();
  for (const cle of cles) {
    const semaine = semaineDeCle(cle);
    const jour = jourDeCle(cle);
    if (!semaine || !jour) continue;
    const jourCible = mapping[jour];
    if (jourCible === undefined) continue;
    out.add(`S${semaine}_J${jourCible}`);
  }
  return [...out];
}

export interface PlannedItem<T = unknown> {
  programme: DecodedProgramme;
  gridKey: string;
  /** index de l'item dans sa case — nécessaire pour /entrainement/seance */
  itemIndex: number;
  item: T;
}

/**
 * Tous les items planifiés à une date donnée, tous programmes actifs confondus.
 * L'ordre suit celui de `programmes` (donc date de début croissante).
 */
export function itemsForDate<T = unknown>(programmes: DecodedProgramme[], date: Date): PlannedItem<T>[] {
  const out: PlannedItem<T>[] = [];
  for (const programme of programmes) {
    const gridKey = gridKeyFor(programme, date);
    if (!gridKey) continue;
    const items = (programme.grid[gridKey] ?? []) as T[];
    items.forEach((item, itemIndex) => out.push({ programme, gridKey, itemIndex, item }));
  }
  return out;
}

/** Numéro de semaine courant d'un programme (borné à sa durée). */
export function semaineCourante(programme: DecodedProgramme, now: Date = new Date()): number {
  if (!programme.date_debut) return 1;
  const start = parseLocalDate(programme.date_debut);
  start.setHours(0, 0, 0, 0);
  const ref = new Date(now);
  ref.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((ref.getTime() - start.getTime()) / 86_400_000);
  return Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), programme.duree_semaines);
}

/** Le programme a-t-il déjà commencé à cette date ? */
export function hasStarted(programme: DecodedProgramme, date: Date = new Date()): boolean {
  if (!programme.date_debut) return false;
  const start = parseLocalDate(programme.date_debut);
  start.setHours(0, 0, 0, 0);
  const ref = new Date(date);
  ref.setHours(0, 0, 0, 0);
  return ref.getTime() >= start.getTime();
}
