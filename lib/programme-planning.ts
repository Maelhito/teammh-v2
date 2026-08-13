// Utilitaires partagés pour la planification des programmes d'une cliente.
//
// Une cliente peut avoir PLUSIEURS programmes "en_cours" en même temps : le coach
// peut ainsi programmer à l'avance (ex. un programme qui démarre dans 4 semaines
// pendant qu'un autre est en cours). Chaque assignation porte sa propre date de
// début et sa propre grille ; c'est la date de début qui décide du jour réel de
// chaque case `S{semaine}_J{jour}`.

export interface AssignmentRow {
  id: string;
  date_debut: string | null;
  grid_data: string | null;
  statut?: string | null;
  seances_effectuees?: number | null;
  programme?: {
    id?: string;
    nom?: string | null;
    niveau?: string | null;
    duree_semaines?: number | null;
    description?: string | null;
  } | null;
}

export interface DecodedProgramme {
  /** id de l'assignation (client_programmes.id), pas du template */
  id: string;
  nom: string;
  niveau: string;
  date_debut: string | null;
  duree_semaines: number;
  /**
   * Nombre de semaines réellement occupées par la grille — au moins
   * `duree_semaines`, plus si le coach a ajouté des séances au-delà. C'est cette
   * valeur qui borne la fenêtre du programme dans le calendrier.
   */
  fenetreSemaines: number;
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
  const fromGrid = safeParse(row.grid_data);
  const fromTemplate = safeParse(row.programme?.description ?? null);

  // grid_data est la copie personnalisée pour cette cliente ; on retombe sur le
  // template tant qu'aucune grille n'y a été enregistrée.
  const grid =
    (fromGrid.grid as Record<string, unknown[]> | undefined) ??
    (fromTemplate.grid as Record<string, unknown[]> | undefined) ??
    {};

  const duree_semaines =
    (fromGrid.duree_semaines as number | undefined) ??
    row.programme?.duree_semaines ??
    (fromTemplate.duree_semaines as number | undefined) ??
    4;

  const maxSemaineGrille = Object.keys(grid).reduce((max, key) => {
    const m = key.match(/^S(\d+)_J\d+$/);
    return m && (grid[key] ?? []).length ? Math.max(max, parseInt(m[1])) : max;
  }, 0);

  return {
    id: row.id,
    nom: row.programme?.nom ?? "Mon programme",
    niveau: row.programme?.niveau ?? "",
    date_debut: row.date_debut,
    duree_semaines,
    fenetreSemaines: Math.max(duree_semaines, maxSemaineGrille),
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

/** Date réelle d'une case de grille pour un programme donné. */
export function gridKeyToDate(key: string, dateDebut: Date): Date | null {
  const m = key.match(/^S(\d+)_J(\d+)$/);
  if (!m) return null;
  const d = new Date(dateDebut);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (parseInt(m[1]) - 1) * 7 + (parseInt(m[2]) - 1));
  return d;
}

/** Clé de grille d'un programme pour la date du jour, ou null hors fenêtre. */
export function gridKeyFor(programme: DecodedProgramme, date: Date): string | null {
  if (!programme.date_debut) return null;
  return dateToGridKey(date, parseLocalDate(programme.date_debut), programme.fenetreSemaines);
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
