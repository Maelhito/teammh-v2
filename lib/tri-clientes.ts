/**
 * Ordre d'affichage des clientes.
 *
 * L'espace admin les range par **ordre d'arrivée dans le programme** — la plus
 * ancienne en haut — et ne relègue en bas que celles dont l'accès a été
 * **révoqué** : elles ne travaillent plus, elles n'ont donc pas à s'intercaler
 * dans la file.
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

/**
 * Tri du portail coach : par ordre alphabétique, mais les clientes dont l'accès
 * est révoqué passent toujours en fin de liste.
 * `nom` est le libellé affiché (prénom + nom, ou l'e-mail à défaut).
 */
export function trierClientesAlpha<T extends ClienteTriable>(
  clientes: T[],
  nom: (c: T) => string
): T[] {
  return [...clientes].sort((a, b) => {
    const ra = a.acces_app === false ? 1 : 0;
    const rb = b.acces_app === false ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return normaliser(nom(a)).localeCompare(normaliser(nom(b)), "fr");
  });
}

/**
 * Tri de l'espace admin : ordre d'arrivée dans le programme, les accès révoqués
 * repoussés tout en bas (eux-mêmes dans leur ordre d'arrivée).
 */
export function trierClientes<T extends ClienteTriable>(clientes: T[]): T[] {
  return [...clientes].sort((a, b) => {
    const ra = a.acces_app === false ? 1 : 0;
    const rb = b.acces_app === false ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return cleArrivee(a).localeCompare(cleArrivee(b));
  });
}
