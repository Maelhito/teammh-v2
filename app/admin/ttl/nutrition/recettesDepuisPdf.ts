"use client";

import { cleRecette, TTL_RECETTE_CALORIES } from "@/lib/ttl";
import type { TtlRecetteCategorie } from "@/lib/ttl";
import { chargerPdfjs, pageEnImages } from "./pdfEnImages";
import type { PageImages } from "./pdfEnImages";

/** Une recette repérée dans le PDF d'un plan alimentaire. */
export interface FicheRecette {
  page: number;
  titre: string;
  categorie: TtlRecetteCategorie | null;
  calories: number | null;
  images: PageImages;
}

/** Les libellés de repas des pages « Jour X », et la catégorie de l'app correspondante. */
const REPAS: [RegExp, TtlRecetteCategorie][] = [
  [/petit[- ]d[ée]jeuner/i, "petit_dej"],
  [/snack|collation|go[uû]ter/i, "collation"],
  [/d[ée]jeuner/i, "repas"],
  [/d[iî]ner|souper/i, "repas"],
];

interface MorceauTexte {
  str: string;
  height: number;
  transform: number[];
}

interface PageLue {
  lignes: string[];
  titre: string;
  texte: string;
}

/**
 * Le texte d'un PDF n'est pas rangé dans l'ordre de lecture : il faut le remettre en place
 * d'après la position de chaque morceau sur la page. Le titre de la recette est le texte
 * écrit le plus gros.
 */
function lirePage(morceaux: MorceauTexte[]): PageLue {
  const utiles = (Array.isArray(morceaux) ? morceaux : []).filter(
    (m) => m && typeof m.str === "string" && m.str.trim() && Array.isArray(m.transform),
  );
  const parLigne = new Map<number, MorceauTexte[]>();
  let hauteurMax = 0;
  utiles.forEach((m) => {
    const y = Math.round(m.transform[5] / 4);
    const deja = parLigne.get(y);
    if (deja) deja.push(m);
    else parLigne.set(y, [m]);
    hauteurMax = Math.max(hauteurMax, m.height ?? 0);
  });

  const lignes = Array.from(parLigne.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, ms]) =>
      ms.sort((a, b) => a.transform[4] - b.transform[4]).map((m) => m.str).join(" ").replace(/\s+/g, " ").trim(),
    );

  const titre = utiles
    .filter((m) => m.height >= hauteurMax - 0.5)
    .sort((a, b) => (Math.abs(b.transform[5] - a.transform[5]) > 2 ? b.transform[5] - a.transform[5] : a.transform[4] - b.transform[4]))
    .map((m) => m.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return { lignes, titre, texte: lignes.join(" ") };
}

/** La tranche de calories la plus proche de la valeur écrite sur la fiche. */
function trancheLaPlusProche(categorie: TtlRecetteCategorie | null, kcal: number | null): number | null {
  if (!categorie || kcal === null) return null;
  return TTL_RECETTE_CALORIES[categorie].reduce((a, b) => (Math.abs(b - kcal) < Math.abs(a - kcal) ? b : a));
}

/**
 * Lit le PDF d'un plan et en sort les fiches recettes :
 * - seules les pages de recette sont gardées (celles qui portent « Pour 1 part ») ;
 * - les doublons sont retirés (le même plat revient à chaque jour du plan) ;
 * - le nom, les calories et la catégorie sont devinés depuis le texte du PDF,
 *   la catégorie venant des pages « Jour X » qui disent le repas de chaque plat.
 */
export async function recettesDepuisPdf(
  fichier: Blob,
  onProgress: (page: number, total: number) => void,
): Promise<FicheRecette[]> {
  const pdfjs = await chargerPdfjs();
  const chargement = pdfjs.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()) });
  const pdf = await chargement.promise;

  try {
    // 1er passage : le texte de chaque page, pour repérer les recettes et lire les menus du jour.
    const pages: PageLue[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress(i, pdf.numPages);
      try {
        const page = await pdf.getPage(i);
        const contenu = await page.getTextContent();
        pages.push(lirePage(contenu.items as MorceauTexte[]));
        page.cleanup();
      } catch (e) {
        throw new Error(`texte de la page ${i} (${e instanceof Error ? e.message : e})`);
      }
    }

    // « Déjeuner: Wrap Thon-Mayo » sur les pages « Jour X » : le plat appartient aux repas.
    const categorieParPlat = new Map<string, TtlRecetteCategorie>();
    pages.forEach((p) => {
      p.lignes.forEach((ligne) => {
        // Certaines pages collent plusieurs libellés : on retient le dernier avant le nom du plat.
        const m = ligne.match(/([^:]+):\s*([^:]{3,})$/);
        if (!m) return;
        const repas = REPAS.find(([r]) => r.test(m[1]));
        const plat = cleRecette(m[2]);
        if (repas && plat && !categorieParPlat.has(plat)) categorieParPlat.set(plat, repas[1]);
      });
    });

    // 2e passage : on ne rend en image que les pages de recette encore inconnues.
    const fiches: FicheRecette[] = [];
    const vues = new Set<string>();
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = pages[i - 1];
      if (!/pour\s*1\s*part/i.test(p.texte) || !p.titre) continue;
      const cle = cleRecette(p.titre);
      if (vues.has(cle)) continue;
      vues.add(cle);

      onProgress(i, pdf.numPages);
      let images;
      try {
        const page = await pdf.getPage(i);
        images = await pageEnImages(page, 2000, 800);
        page.cleanup();
      } catch (e) {
        throw new Error(`image de la page ${i} (${e instanceof Error ? e.message : e})`);
      }

      const categorie = categorieParPlat.get(cle) ?? null;
      const kcal = p.texte.match(/(\d{2,4})\s*kcal/i);
      fiches.push({
        page: i,
        titre: p.titre,
        categorie,
        calories: trancheLaPlusProche(categorie, kcal ? Number(kcal[1]) : null),
        images,
      });
    }

    return fiches;
  } finally {
    await chargement.destroy();
  }
}
