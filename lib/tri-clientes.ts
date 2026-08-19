/**
 * Ordre d'affichage des clientes, identique dans le portail coach et l'espace
 * admin : d'abord par état, puis par ordre d'arrivée.
 *
 * Les trois états ne viennent pas du même champ, d'où ce regroupement :
 *  0 · Active     — statut « active » et accès à l'app autorisé
 *  1 · Suspendue  — statut « pause » ou « terminée » : elle ne peut plus entrer
 *                   dans l'app (renvoyée vers /acces-suspendu) sans être révoquée
 *  2 · Révoquée   — accès à l'app retiré depuis l'admin (acces_app = false)
 *
 * Le bouton « Déconnecter » de l'admin ferme la session sur le moment mais ne
 * laisse aucune trace en base : il n'existe donc aucun état « déconnectée » sur
 * lequel trier. C'est « suspendue » qui joue ce rôle intermédiaire.
 */

export type EtatCliente = 0 | 1 | 2;

export interface ClienteTriable {
  statut: string;
  /** false = accès révoqué. Absent ou null = autorisé. */
  acces_app?: boolean | null;
  /** Date de démarrage (YYYY-MM-DD) — l'arrivée dans le programme. */
  date_demarrage?: string | null;
  /** Création du compte, utilisée quand la date de démarrage manque. */
  created_at?: string | null;
}

export function etatCliente(c: ClienteTriable): EtatCliente {
  if (c.acces_app === false) return 2;
  if (c.statut === "pause" || c.statut === "terminee") return 1;
  return 0;
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

/** Trie une copie de la liste : état croissant, puis arrivée croissante. */
export function trierClientes<T extends ClienteTriable>(clientes: T[]): T[] {
  return [...clientes].sort((a, b) => {
    const ea = etatCliente(a);
    const eb = etatCliente(b);
    if (ea !== eb) return ea - eb;
    return cleArrivee(a).localeCompare(cleArrivee(b));
  });
}
