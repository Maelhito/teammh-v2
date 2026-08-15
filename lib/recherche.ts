/**
 * Recherche tolérante aux accents et à la casse.
 *
 * Taper « elevation » doit trouver « Élévations latérales », « developpe » doit
 * trouver « Développé couché ». Sans ça, la coach doit connaître l'orthographe
 * exacte avec accents pour retrouver son propre exercice.
 *
 * Module pur : aucune dépendance navigateur, utilisable côté serveur.
 */

/** Minuscules, sans accents, sans espaces superflus. */
export function normaliserTexte(s: string): string {
  return s
    .normalize("NFD")                    // « é » → « e » + accent combinant
    .replace(/[\u0300-\u036f]/g, "")   // retire les accents combinants
    .toLowerCase()
    .trim();
}

/** `texte` contient-il `saisie`, accents et casse ignorés ? */
export function contientRecherche(texte: string | null | undefined, saisie: string): boolean {
  const q = normaliserTexte(saisie);
  if (!q) return true;                   // recherche vide = on ne filtre pas
  return normaliserTexte(texte ?? "").includes(q);
}

/** Tri alphabétique français : « Élévations » se range à E, pas après Z. */
export function comparerNoms(a: string, b: string): number {
  return a.localeCompare(b, "fr", { sensitivity: "base" });
}
