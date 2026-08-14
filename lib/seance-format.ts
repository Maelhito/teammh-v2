// Format d'encodage/décodage d'une séance.
// Module PUR (pas de "use client") : importable depuis un composant serveur
// (app/entrainement) comme depuis le builder coach.

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string; nom: string; groupe_musculaire: string; materiel: string;
  video_url: string | null; miniature_url: string | null;
  type_format?: string | null;
}
export interface TabataItem {
  _key: string; exercise_id: string; exercise: Exercise;
  series: string; tabata_work: string; tabata_rest: string; notes: string;
}
export interface RichExercise { _key: string; exercise: Exercise; }
export type BlocType = "echauffement" | "corps" | "finisher";
export interface Bloc {
  _key: string; type: BlocType; nom: string; format: string;
  instructions: string;
  type_score: string;
  note_bloc: string;
  tabata_work: string; tabata_rest: string; tabata_tours: string;
  tabata_exercices: TabataItem[];
  emom_rounds: string; emom_interval_min: string; emom_interval_sec: string;
  amrap_duree: string; for_time_limit: string;
  rich_exercices: RichExercise[];
}
export interface SeanceData {
  nom: string; categorie: string; niveau: string; duree_estimee: string; note: string;
  blocs: Bloc[];
}
export interface FlatExercice {
  exercise_id: string;
  ordre: number;
  series: number | null;
  duree_secondes: number | null;
  temps_repos: number | null;
  notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _k = 0;
export function newKey() { return `k${++_k}_${Date.now()}`; }

export function ytThumb(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** seance_exercices.exercise_id a une FK vers exercises(id) : un id vide ou
 *  bricolé fait échouer l'INSERT complet (donc perd TOUS les exercices). */
function isValidExerciseId(id: string | undefined | null): id is string {
  return !!id && UUID_RE.test(id);
}

/** Ordre encodé = index du bloc * 10000 + index de l'exercice dans le bloc.
 *  decodeSeance() reconstruit l'index du bloc à partir de cette valeur. */
export const ORDRE_BLOC_STRIDE = 10000;

export function defaultBloc(type: BlocType, i = 1): Bloc {
  return {
    _key: newKey(), type,
    nom: type === "echauffement" ? "Échauffement" : type === "finisher" ? "Finisher" : `Bloc ${i}`,
    format: "classique", instructions: "",
    type_score: "", note_bloc: "",
    tabata_work: "20", tabata_rest: "10", tabata_tours: "8", tabata_exercices: [],
    emom_rounds: "10", emom_interval_min: "1", emom_interval_sec: "0",
    amrap_duree: "10", for_time_limit: "20",
    rich_exercices: [],
  };
}

// ─── Encode ───────────────────────────────────────────────────────────────────
export function encodeSeance(d: SeanceData): { description: string; flat_exercices: FlatExercice[] } {
  const description = JSON.stringify({
    categorie: d.categorie, niveau: d.niveau,
    blocs: d.blocs.map(b => ({
      key: b._key, type: b.type, nom: b.nom, format: b.format,
      instructions: b.instructions,
      ts: b.type_score,
      nb: b.note_bloc,
      tw: b.tabata_work, tr: b.tabata_rest, tt: b.tabata_tours,
      er: b.emom_rounds, eim: b.emom_interval_min, eis: b.emom_interval_sec,
      ad: b.amrap_duree, ftl: b.for_time_limit,
      rich: b.rich_exercices.map(re => ({
        key: re._key,
        exId: re.exercise.id, exNom: re.exercise.nom,
        exGroupe: re.exercise.groupe_musculaire,
        exVideo: re.exercise.video_url,
        exThumb: re.exercise.miniature_url || ytThumb(re.exercise.video_url),
      })),
    })),
    note: d.note,
  });

  // Index plat (table seance_exercices) : TOUS les blocs, pas seulement les tabata,
  // sinon le compteur "N ex." et les lectures directes de la table voient 0 exercice.
  const flat_exercices: FlatExercice[] = d.blocs.flatMap((b, bi) => {
    if (b.format === "tabata") {
      return b.tabata_exercices
        .filter(ex => isValidExerciseId(ex.exercise_id ?? ex.exercise?.id))
        .map((ex, ei) => ({
          exercise_id: (ex.exercise_id || ex.exercise.id) as string,
          ordre: bi * ORDRE_BLOC_STRIDE + ei,
          series: ex.series ? parseInt(ex.series) : null,
          duree_secondes: ex.tabata_work ? parseInt(ex.tabata_work) : null,
          temps_repos: ex.tabata_rest ? parseInt(ex.tabata_rest) : null,
          notes: ex.notes || null,
        }));
    }
    return b.rich_exercices
      .filter(re => isValidExerciseId(re.exercise?.id))
      .map((re, ei) => ({
        exercise_id: re.exercise.id,
        ordre: bi * ORDRE_BLOC_STRIDE + ei,
        series: null,
        duree_secondes: null,
        temps_repos: null,
        notes: null,
      }));
  });

  return { description, flat_exercices };
}

// ─── Decode ───────────────────────────────────────────────────────────────────
export function decodeSeance(
  seance: Record<string, unknown>,
  exercices: Record<string, unknown>[],
): SeanceData {
  let meta: Record<string, unknown> = {};
  try {
    if ((seance.description as string)?.startsWith("{"))
      meta = JSON.parse(seance.description as string);
  } catch {}

  const blocs_meta = (meta.blocs as Record<string, unknown>[] | undefined) ?? [];

  // Rattrapage des séances enregistrées quand l'API écrasait `ordre` par
  // l'index du tableau : toutes les lignes valent alors 0,1,2… donc « bloc 0 ».
  // À l'époque seuls les blocs tabata étaient écrits ; s'il n'y en a qu'un, on
  // sait sans ambiguïté à qui ces exercices appartiennent — on les lui rend.
  const tabataIdx = blocs_meta
    .map((bm, i) => (bm.format === "tabata" ? i : -1))
    .filter(i => i >= 0);
  const looksLegacy =
    exercices.length > 0 &&
    exercices.every(ex => (((ex.ordre as number) ?? 0) < ORDRE_BLOC_STRIDE)) &&
    tabataIdx.length === 1 && tabataIdx[0] !== 0;

  const exByBlocIdx: Record<number, Record<string, unknown>[]> = {};
  for (const ex of exercices) {
    const bi = looksLegacy
      ? tabataIdx[0]
      : Math.floor(((ex.ordre as number) ?? 0) / ORDRE_BLOC_STRIDE);
    if (!exByBlocIdx[bi]) exByBlocIdx[bi] = [];
    exByBlocIdx[bi].push(ex);
  }

  const blocs: Bloc[] = blocs_meta.length
    ? blocs_meta.map((bm, bi) => {
        const format = (bm.format as string) || "classique";
        const richRaw =
          (bm.rich as {
            key: string; exId: string; exNom: string; exGroupe: string;
            exVideo: string | null; exThumb: string | null;
          }[]) ?? [];
        // Seuls les blocs tabata lisent la table plate : sinon un bloc classique
        // se retrouverait avec des exercices fantômes en changeant de format.
        const tabata_exercices = format === "tabata"
          ? (exByBlocIdx[bi] ?? []).map(ex => {
              const exercise = ex.exercise as Exercise;
              return {
                _key: newKey(),
                exercise_id: exercise?.id ?? (ex.exercise_id as string),
                exercise,
                series: (ex.series as number | null)?.toString() ?? "",
                tabata_work: (ex.duree_secondes as number | null)?.toString() ?? "20",
                tabata_rest: (ex.temps_repos as number)?.toString() ?? "10",
                notes: (ex.notes as string | null) ?? "",
              };
            })
          : [];
        return {
          _key: (bm.key as string) || newKey(),
          type: bm.type as BlocType,
          nom: (bm.nom as string) || "",
          format,
          instructions: (bm.instructions as string) || "",
          type_score: (bm.ts as string) || "",
          note_bloc: (bm.nb as string) || "",
          tabata_work: (bm.tw as string) || "20",
          tabata_rest: (bm.tr as string) || "10",
          tabata_tours: (bm.tt as string) || "8",
          tabata_exercices,
          emom_rounds: (bm.er as string) || "10",
          emom_interval_min: (bm.eim as string) || "1",
          emom_interval_sec: (bm.eis as string) || "0",
          amrap_duree: (bm.ad as string) || "10",
          for_time_limit: (bm.ftl as string) || "20",
          rich_exercices: richRaw.map(r => ({
            _key: r.key || newKey(),
            exercise: {
              id: r.exId, nom: r.exNom, groupe_musculaire: r.exGroupe,
              materiel: "", video_url: r.exVideo, miniature_url: r.exThumb,
            },
          })),
        };
      })
    : [defaultBloc("echauffement"), defaultBloc("corps", 1)];

  return {
    nom: (seance.nom as string) || "",
    categorie: (meta.categorie as string) || "full_body",
    niveau: (meta.niveau as string) || "debutant",
    duree_estimee: (seance.duree_estimee as number | null)?.toString() || "45",
    note: (meta.note as string) || "",
    blocs,
  };
}
