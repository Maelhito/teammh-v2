/**
 * Ordre d'affichage des clientes.
 *
 * L'espace admin laisse choisir l'ordre (arrivée dans le programme ou nom, dans
 * les deux sens), et part sur l'arrivée de la plus ancienne à la plus récente.
 * Quel que soit l'ordre, il ne relègue en bas que les clientes dont l'accès a
 * été **révoqué** : elles ne travaillent plus, elles n'ont donc pas à
 * s'intercaler dans la file.
 *
 * Les clientes en pause ou terminées gardent leur place dans cette file. Elles
 * formaient auparavant un groupe intermédiaire, ce qui les faisait sauter d'un
 * bout à l'autre de la liste à chaque changement de statut alors qu'elles sont
 * toujours suivies.
 *
 * Le portail coach, lui, trie par ordre alphabétique (`trierClientesAlpha`) :
 * il cherche une personne par son nom, pas par son ancienneté. Seule la règle
 * « révoquée tout en bas » est commune aux deux.
 */

export interface ClienteTriable {
  /** false = accès révoqué. Absent ou null = autorisé. */
  acces_app?: boolean | null;
  /** Date de démarrage (YYYY-MM-DD) — l'arrivée dans le programme. */
  date_demarrage?: string | null;
  /** Création du compte, utilisée quand la date de démarrage manque. */
  created_at?: string | null;
}

/** Clé d'arrivée : la plus ancienne d'abord, celles sans date à la fin. */
function cleArrivee(c: ClienteTriable): string {
  return c.date_demarrage ?? c.created_at ?? "9999-12-31";
}

/**
 * Libellé affiché d'une cliente. Vit ici (et non dans le composant de grille)
 * pour rester appelable côté serveur : un composant serveur ne peut pas appeler
 * une fonction exportée d'un module « use client ».
 */
export function clientLabel(c: { prenom: string | null; nom: string | null; email: string }) {
  return c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email;
}

/** Texte comparable : sans accents ni casse, pour trier et chercher. */
export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Les ordres proposés dans l'espace admin, dans l'ordre du menu. */
export const ORDRES_CLIENTES = [
  { value: "arrivee_asc",  label: "Arrivée · la plus ancienne d'abord" },
  { value: "arrivee_desc", label: "Arrivée · la plus récente d'abord" },
  { value: "alpha_asc",    label: "Nom · A → Z" },
  { value: "alpha_desc",   label: "Nom · Z → A" },
] as const;

export type OrdreClientes = (typeof ORDRES_CLIENTES)[number]["value"];

export const ORDRE_PAR_DEFAUT: OrdreClientes = "arrivee_asc";

/** Un ordre lu ailleurs (localStorage…) n'est retenu que s'il existe encore. */
export function normaliseOrdre(v: unknown): OrdreClientes {
  return ORDRES_CLIENTES.some(o => o.value === v) ? (v as OrdreClientes) : ORDRE_PAR_DEFAUT;
}

/**
 * Trie une copie de la liste selon l'ordre demandé.
 *
 * Quel que soit l'ordre — y compris inversé — les clientes dont l'accès est
 * révoqué restent tout en bas : « en bas » est leur place, pas une position
 * dans le classement qu'un tri décroissant ferait remonter en tête.
 *
 * `nom` est le libellé comparé pour les tris alphabétiques.
 */
export function trierClientesPar<T extends ClienteTriable>(
  clientes: T[],
  ordre: OrdreClientes,
  nom: (c: T) => string,
): T[] {
  return [...clientes].sort((a, b) => {
    const ra = a.acces_app === false ? 1 : 0;
    const rb = b.acces_app === false ? 1 : 0;
    if (ra !== rb) return ra - rb;
    switch (ordre) {
      case "arrivee_desc": return cleArrivee(b).localeCompare(cleArrivee(a));
      case "alpha_asc":    return normaliser(nom(a)).localeCompare(normaliser(nom(b)), "fr");
      case "alpha_desc":   return normaliser(nom(b)).localeCompare(normaliser(nom(a)), "fr");
      default:             return cleArrivee(a).localeCompare(cleArrivee(b));
    }
  });
}

/**
 * Tri du portail coach : par ordre alphabétique, les accès révoqués en fin de
 * liste. Il n'y est pas réglable — on y cherche une personne par son nom.
 */
export function trierClientesAlpha<T extends ClienteTriable>(
  clientes: T[],
  nom: (c: T) => string
): T[] {
  return trierClientesPar(clientes, "alpha_asc", nom);
}

/**
 * Ordre d'arrivée dans le programme : l'ordre par défaut de l'espace admin,
 * celui du rendu serveur avant que le navigateur applique le choix retenu.
 */
export function trierClientes<T extends ClienteTriable>(clientes: T[]): T[] {
  return trierClientesPar(clientes, ORDRE_PAR_DEFAUT, () => "");
}
