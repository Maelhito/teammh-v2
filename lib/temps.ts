/**
 * Module unique du temps — TeamMJ.
 *
 * Règle du projet : personne ne vit dans le même fuseau. Mael et Julie sont à
 * Bali (UTC+8), les coachs en Australie (UTC+10/+11, et ils bougent), les
 * clientes en Nouvelle-Calédonie (UTC+11) — et n'importe qui peut partir en
 * vacances ailleurs.
 *
 * Deux conséquences, à respecter partout :
 *
 *   1. `new Date().toISOString().slice(0, 10)` côté serveur est TOUJOURS un
 *      bug. Le process Vercel tourne en UTC : à Nouméa, de minuit à 11h du
 *      matin, ce calcul renvoie la veille. Utiliser `aujourdhuiDans(fuseau)`.
 *
 *   2. Un événement à instant fixe (rendez-vous, visio) doit se stocker comme
 *      un instant unique et s'afficher converti dans le fuseau du lecteur.
 *      Un événement « jour local » (séance, tâche) garde une date nue, mais
 *      cette date s'interprète dans le fuseau de la personne, jamais en UTC.
 */

/**
 * Repli quand on ne sait rien du fuseau de la personne.
 *
 * Nouméa et non Paris : la quasi-totalité des comptes sont des clientes
 * calédoniennes. Ce repli ne sert que le temps qu'un appareil annonce son
 * vrai fuseau, ce qui arrive au premier chargement de l'app (SyncFuseau).
 */
export const FUSEAU_PAR_DEFAUT = "Pacific/Noumea";

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Un fuseau est valide s'il est reconnu par l'ICU du runtime. On ne se fie pas
 * à une liste en dur : elle serait fausse dès la prochaine mise à jour de la
 * base IANA.
 */
export function estFuseauValide(fuseau: unknown): fuseau is string {
  if (typeof fuseau !== "string" || !fuseau.trim()) return false;
  // "UTC" et les identifiants IANA seulement — pas d'offset brut ("+11:00"),
  // qui ne dit rien du changement d'heure et se périmerait.
  if (!/^[A-Za-z][A-Za-z0-9+_-]*(\/[A-Za-z0-9+_-]+)*$/.test(fuseau)) return false;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Renvoie le fuseau s'il est valide, sinon le repli. Ne jette jamais. */
export function fuseauOuDefaut(fuseau: unknown, repli = FUSEAU_PAR_DEFAUT): string {
  return estFuseauValide(fuseau) ? fuseau : repli;
}

// ─── Lecture des parties d'un instant dans un fuseau ──────────────────────────

export interface PartiesLocales {
  annee: number;
  mois: number;      // 1–12
  jour: number;      // 1–31
  heure: number;     // 0–23
  minute: number;
  /** "YYYY-MM-DD" dans le fuseau demandé */
  dateStr: string;
  /** 0 = dimanche … 6 = samedi, dans le fuseau demandé */
  jourSemaine: number;
}

const CACHE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatteur(fuseau: string): Intl.DateTimeFormat {
  let f = CACHE_FORMATTERS.get(fuseau);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: fuseau,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short",
    });
    CACHE_FORMATTERS.set(fuseau, f);
  }
  return f;
}

const JOURS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Décompose un instant dans le fuseau demandé. */
export function partiesDans(instant: Date, fuseau: string): PartiesLocales {
  const tz = fuseauOuDefaut(fuseau);
  const parts = Object.fromEntries(
    formatteur(tz).formatToParts(instant).map((p) => [p.type, p.value])
  );
  // hourCycle h23 peut rendre "24" sur certains runtimes — on ramène à 0.
  const heure = parseInt(parts.hour ?? "0", 10) % 24;
  return {
    annee: parseInt(parts.year ?? "1970", 10),
    mois: parseInt(parts.month ?? "01", 10),
    jour: parseInt(parts.day ?? "01", 10),
    heure,
    minute: parseInt(parts.minute ?? "0", 10),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    jourSemaine: JOURS[parts.weekday ?? "Sun"] ?? 0,
  };
}

/**
 * La date du jour ("YYYY-MM-DD") telle que la voit la personne.
 * Remplace `new Date().toISOString().slice(0, 10)` côté serveur.
 */
export function aujourdhuiDans(fuseau: string, instant: Date = new Date()): string {
  return partiesDans(instant, fuseau).dateStr;
}

/** Décalage UTC courant d'un fuseau, en minutes, changement d'heure compris. */
export function decalageMinutes(fuseau: string, instant: Date = new Date()): number {
  const p = partiesDans(instant, fuseau);
  const commeUtc = Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute);
  // On tronque l'instant aux minutes pour comparer deux valeurs de même grain.
  const instantMinutes = Math.floor(instant.getTime() / 60000) * 60000;
  return Math.round((commeUtc - instantMinutes) / 60000);
}

/** "+11:00", "-03:30" — pour l'afficher à côté du nom du fuseau. */
export function decalageLisible(fuseau: string, instant: Date = new Date()): string {
  const min = decalageMinutes(fuseau, instant);
  const signe = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  return `UTC${signe}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** "Pacific/Noumea" → "Nouméa". Pour l'affichage, jamais pour du calcul. */
export function nomLisible(fuseau: string): string {
  const tz = fuseauOuDefaut(fuseau);
  const ville = tz.split("/").pop() ?? tz;
  return ville.replace(/_/g, " ");
}

// ─── Heure murale ⇄ instant ───────────────────────────────────────────────────

/**
 * Construit l'instant correspondant à une heure murale dans un fuseau donné.
 *
 * C'est la pièce qui manquait : quand un coach à Brisbane tape « 9:00 », cette
 * fonction transforme ce 9:00-heure-de-Brisbane en un instant unique. La
 * cliente à Nouméa le relit dans SON fuseau et voit 10:00 — le même moment.
 *
 * L'aller-retour se fait en deux passes à cause des changements d'heure : le
 * décalage à appliquer dépend de l'instant, qu'on ne connaît qu'après l'avoir
 * appliqué. La seconde passe corrige les dates qui tombent près d'une bascule.
 *
 * Cas limites d'un changement d'heure :
 *   • heure inexistante (celle qu'on saute au printemps) → on rend l'instant
 *     juste après la bascule, jamais une erreur ;
 *   • heure ambiguë (celle jouée deux fois à l'automne) → on rend la première.
 * Aucun des deux ne concerne Nouméa ni Bali, mais la France si.
 *
 * @param dateStr  "YYYY-MM-DD"
 * @param heureStr "HH:MM" ou "HH:MM:SS"
 */
export function instantDepuis(dateStr: string, heureStr: string, fuseau: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const h = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(heureStr.trim());
  if (!d || !h) return null;

  const annee = Number(d[1]), mois = Number(d[2]), jour = Number(d[3]);
  const heure = Number(h[1]), minute = Number(h[2]), seconde = Number(h[3] ?? 0);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  if (heure > 23 || minute > 59 || seconde > 59) return null;

  const tz = fuseauOuDefaut(fuseau);
  // Ce que serait l'instant si le fuseau était UTC.
  const commeUtc = Date.UTC(annee, mois - 1, jour, heure, minute, seconde);

  let instant = commeUtc - decalageMinutes(tz, new Date(commeUtc)) * 60000;
  // Seconde passe : le décalage se lit maintenant au bon endroit du calendrier.
  instant = commeUtc - decalageMinutes(tz, new Date(instant)) * 60000;

  return new Date(instant);
}

/** L'heure murale ("HH:MM") d'un instant, telle que la lit quelqu'un dans `fuseau`. */
export function formatHeureDans(instant: Date | string, fuseau: string): string {
  const i = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(i.getTime())) return "";
  const p = partiesDans(i, fuseau);
  return `${String(p.heure).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** La date murale ("YYYY-MM-DD") d'un instant, telle que la lit quelqu'un dans `fuseau`. */
export function formatDateDans(instant: Date | string, fuseau: string): string {
  const i = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(i.getTime())) return "";
  return partiesDans(i, fuseau).dateStr;
}

/**
 * Le même instant vu par deux personnes. Sert à prévenir le coach au moment où
 * il pose l'heure — c'est le garde-fou qui évite le rendez-vous manqué même
 * quand le code est juste.
 *
 * Renvoie null quand les deux fuseaux montrent la même heure murale : il n'y a
 * alors rien à signaler, et afficher un avertissement inutile apprend à
 * l'ignorer.
 */
export function ecartEntre(
  instant: Date,
  fuseauAuteur: string,
  fuseauLecteur: string
): { heureAuteur: string; heureLecteur: string; memeJour: boolean; jourLecteur: string } | null {
  const auteur = partiesDans(instant, fuseauAuteur);
  const lecteur = partiesDans(instant, fuseauLecteur);
  if (auteur.heure === lecteur.heure && auteur.minute === lecteur.minute && auteur.dateStr === lecteur.dateStr) {
    return null;
  }
  return {
    heureAuteur: formatHeureDans(instant, fuseauAuteur),
    heureLecteur: formatHeureDans(instant, fuseauLecteur),
    memeJour: auteur.dateStr === lecteur.dateStr,
    jourLecteur: lecteur.dateStr,
  };
}

// ─── Affichage d'un événement ─────────────────────────────────────────────────

/**
 * Le fuseau de l'appareil qui exécute ce code.
 *
 * À n'appeler QUE dans un composant client : côté serveur, `Intl` renvoie le
 * fuseau de la machine Vercel (UTC), qui n'est celui de personne.
 */
export function fuseauAppareil(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSEAU_PAR_DEFAUT;
  } catch {
    return FUSEAU_PAR_DEFAUT;
  }
}

export interface EvenementHoraire {
  /** L'instant, quand l'événement en a un (rendez-vous, visio). */
  starts_at?: string | null;
  /** L'ancienne heure murale, sans fuseau. Repli pour les lignes pas encore migrées. */
  heure?: string | null;
}

/**
 * L'heure à afficher pour un événement, dans le fuseau du LECTEUR.
 *
 * C'est la fonction qui règle le problème d'origine : le coach à Brisbane a
 * posé 9h, l'instant est stocké, et la cliente à Nouméa lit 10h — le même
 * moment, chacune chez soi.
 *
 * Repli sur `heure` pour les lignes créées avant la migration et jamais
 * rouvertes : mieux vaut l'ancienne heure approximative qu'une case vide.
 */
export function heureAffichee(evt: EvenementHoraire, fuseauLecteur: string | null): string | null {
  // Fuseau inconnu (rendu serveur, avant hydratation) : on rend l'ancienne
  // heure murale plutôt que d'en inventer une. Elle est déjà ce que le HTML
  // serveur affichait, donc pas d'écart d'hydratation ni de clignotement.
  if (evt.starts_at && fuseauLecteur) {
    const h = formatHeureDans(evt.starts_at, fuseauLecteur);
    if (h) return h;
  }
  if (!evt.heure) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(evt.heure);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/**
 * La date à laquelle l'événement tombe pour le lecteur ("YYYY-MM-DD").
 *
 * Un rendez-vous posé à 7h du matin à Nouméa tombe la veille pour quelqu'un à
 * Paris : la date aussi doit se convertir, pas seulement l'heure.
 */
export function dateAffichee(
  evt: EvenementHoraire & { date?: string | null },
  fuseauLecteur: string | null
): string | null {
  if (evt.starts_at && fuseauLecteur) {
    const d = formatDateDans(evt.starts_at, fuseauLecteur);
    if (d) return d;
  }
  return evt.date ?? null;
}

/** "2026-08-21" → "vendredi 21 août". Pour l'affichage uniquement. */
export function dateLisible(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  // Midi UTC : on reste loin des bords de journée, quel que soit le fuseau du
  // navigateur qui met la date en forme.
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
    }).format(d);
  } catch {
    return dateStr;
  }
}

// ─── Semaine calendaire ────────────────────────────────────────────────────────

/**
 * Le lundi et le dimanche de la semaine courante, dans le fuseau demandé.
 *
 * Trois endroits du code réimplémentaient ce calcul (admin, coach, dashboard
 * cliente), chacun avec `new Date()` — donc calé sur l'horloge du serveur
 * (UTC), pas sur celle de la personne qui regarde l'écran. Centralisé ici pour
 * qu'il n'y ait plus qu'un seul endroit où se tromper de fuseau.
 */
export function semaineDans(fuseau: string, instant: Date = new Date()): { lundi: string; dimanche: string; jours: string[] } {
  const p = partiesDans(instant, fuseau);
  // Nombre de jours depuis le lundi de cette semaine-là (lundi=0 … dimanche=6).
  const depuisLundi = (p.jourSemaine + 6) % 7;
  // Arithmétique sur des jours entiers, en UTC : aucune heure n'entre en jeu,
  // donc aucun risque de glissement au changement d'heure.
  const lundiMs = Date.UTC(p.annee, p.mois - 1, p.jour) - depuisLundi * 86400000;

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundiMs + i * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  });

  return { lundi: jours[0], dimanche: jours[6], jours };
}

// ─── Récurrences ──────────────────────────────────────────────────────────────

export interface EvenementCalendrier extends EvenementHoraire {
  /** Date d'ancrage, telle qu'elle a été saisie (mur, sans fuseau). */
  date: string;
  /** Fuseau dans lequel l'heure a été tapée. */
  timezone?: string | null;
  recurrence?: string | null;
}

/**
 * L'événement tombe-t-il le jour `jour` (AAAA-MM-JJ, dans le fuseau du
 * lecteur) ? Renvoie l'instant de cette occurrence-là, ou null s'il ne tombe
 * pas ce jour.
 *
 * Deux choses que la version précédente ne savait pas faire :
 *
 *   1. **Le jour dépend du lecteur.** Un rendez-vous posé à 7h du matin à
 *      Nouméa tombe la veille pour quelqu'un à Paris. Comparer `event.date` à
 *      la date affichée donnait le mauvais jour.
 *
 *   2. **Une récurrence ne se décale pas au changement d'heure.** « Tous les
 *      mardis à 9h heure de Paris » doit rester 9h en octobre comme en juillet.
 *      En rejouant l'heure murale dans le fuseau de saisie pour CHAQUE
 *      occurrence, l'instant est recalculé et la bascule est absorbée. Stocker
 *      un simple décalage aurait fait glisser le rendez-vous d'une heure.
 */
export function occurrenceLe(
  evt: EvenementCalendrier,
  jour: string,
  fuseauLecteur: string | null
): { tombe: boolean; instant: Date | null } {
  const recurrence = evt.recurrence ?? "none";

  // Sans instant (séance, tâche) ou sans fuseau connu (rendu serveur avant
  // hydratation), on raisonne sur la date murale : c'est le comportement
  // historique, et il reste juste pour un « jour local ».
  if (!evt.starts_at || !fuseauLecteur) {
    return { tombe: tombeSurMotif(evt.date, jour, recurrence), instant: null };
  }

  const fuseauSaisie = fuseauOuDefaut(evt.timezone, fuseauLecteur);
  const heureMurale = formatHeureDans(evt.starts_at, fuseauSaisie);
  const ancrageSaisie = formatDateDans(evt.starts_at, fuseauSaisie);

  if (recurrence === "none") {
    const instant = new Date(evt.starts_at);
    return { tombe: formatDateDans(instant, fuseauLecteur) === jour, instant };
  }

  // Une occurrence qui s'affiche le `jour` chez le lecteur a été posée, dans le
  // fuseau de saisie, la veille, le jour même ou le lendemain — jamais plus
  // loin, l'écart entre deux fuseaux ne dépassant pas 26 heures.
  for (const decalage of [-1, 0, 1]) {
    const candidat = decalerJour(jour, decalage);
    if (!tombeSurMotif(ancrageSaisie, candidat, recurrence)) continue;

    const instant = instantDepuis(candidat, heureMurale, fuseauSaisie);
    if (instant && formatDateDans(instant, fuseauLecteur) === jour) {
      return { tombe: true, instant };
    }
  }

  return { tombe: false, instant: null };
}

/** Décale une date "AAAA-MM-JJ" d'un nombre de jours entiers. */
function decalerJour(dateStr: string, jours: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + jours * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Le motif de récurrence, comparé sur deux dates nues du même référentiel. */
function tombeSurMotif(ancrage: string, jour: string, recurrence: string): boolean {
  if (!ancrage || !jour) return false;
  if (jour < ancrage) return false; // une récurrence ne remonte pas le temps

  switch (recurrence) {
    case "none":
      return jour === ancrage;
    case "daily":
      return true;
    case "weekly":
      return jourDeSemaine(ancrage) === jourDeSemaine(jour);
    case "monthly":
      return ancrage.slice(8, 10) === jour.slice(8, 10);
    default:
      return false;
  }
}

/** 0 = dimanche … 6 = samedi, pour une date nue. */
function jourDeSemaine(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return -1;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
}
