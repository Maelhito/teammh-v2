"use client";

import { TTL_RECETTE_CALORIES } from "@/lib/ttl";
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

/** Pour comparer des noms de plats écrits différemment d'une page à l'autre. */
function normaliser(nom: string) {
  return nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** La tranche de calories la plus proche de la valeur écrite sur la fiche. */
function trancheLaPlusProche(categorie: TtlRecetteCategorie | null, kcal: number | null): number | null {
  if (!categorie || kcal === null) return null;
  return TTL_RECETTE_CALORIES[categorie].reduce((a, b) => (Math.abs(b - kcal) < Math.abs(a - kcal) ? b : a));
}

/**
 * Lit le PDF d'un plan et en sort les fiches recettes :
 * - seules les pages de recette sont gardées (celles qui portent « Pour 1 part : … kcal ») ;
 * - les doublons sont retirés (le même plat revient à chaque jour du plan) ;
 * - le nom, les calories et souvent la catégorie sont devinés depuis le texte du PDF.
 */
export async function recettesDepuisPdf(
  file: File,
  onProgress: (page: number, total: number) => void,
): Promise<FicheRecette[]> {
  const pdfjs = await chargerPdfjs();
  const chargement = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await chargement.promise;

  try {
    // 1er passage : le texte de chaque page, pour repérer les recettes et lire les menus du jour.
    const lignesParPage: string[][] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const contenu = await page.getTextContent();
      const lignes: string[] = [];
      let ligne = "";
      let y: number | null = null;
      for (const item of contenu.items) {
        if (!("str" in item)) continue;
        const yItem = Math.round(item.transform[5]);
        if (y !== null && Math.abs(yItem - y) > 3) { lignes.push(ligne.trim()); ligne = ""; }
        y = yItem;
        ligne += item.str;
        if (item.hasEOL) { lignes.push(ligne.trim()); ligne = ""; y = null; }
      }
      if (ligne.trim()) lignes.push(ligne.trim());
      lignesParPage.push(lignes.filter(Boolean));
      page.cleanup();
    }

    // Les pages « Jour X » disent à quel repas appartient chaque plat : « Déjeuner: Wrap Thon-Mayo ».
    const categorieParPlat = new Map<string, TtlRecetteCategorie>();
    for (const lignes of lignesParPage) {
      for (const ligne of lignes) {
        // Certaines pages collent plusieurs libellés : on retient le dernier avant le nom du plat.
        const m = ligne.match(/([^:]+):\s*([^:]{3,})$/);
        if (!m) continue;
        const repas = REPAS.find(([r]) => r.test(m[1]));
        const plat = normaliser(m[2]);
        if (repas && plat && !categorieParPlat.has(plat)) categorieParPlat.set(plat, repas[1]);
      }
    }

    // 2e passage : on ne rend en image que les pages de recette encore inconnues.
    const fiches: FicheRecette[] = [];
    const vues = new Set<string>();
    for (let i = 1; i <= pdf.numPages; i++) {
      const lignes = lignesParPage[i - 1];
      const texte = lignes.join(" | ");
      const part = texte.match(/pour\s*1\s*part\s*:?\s*(\d+)\s*kcal/i);
      if (!part) continue;

      // Le titre est la première ligne un peu longue qui n'est ni un ingrédient ni un temps de
      // préparation ; un titre long tient sur deux lignes, jusqu'au premier ingrédient.
      const debut = lignes.findIndex((l) => l.length > 3 && !/^[-•]/.test(l) && !/^(pr[ée]p|cuisson|parts?|\d)/i.test(l));
      if (debut < 0) continue;
      const suite = lignes.slice(debut).findIndex((l) => /^[-•]/.test(l));
      const titre = lignes.slice(debut, suite > 0 ? debut + suite : debut + 1).join(" ").replace(/\s+/g, " ").trim();
      if (!titre) continue;
      const cle = normaliser(titre);
      if (vues.has(cle)) continue;
      vues.add(cle);

      onProgress(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const images = await pageEnImages(page, 2000, 800);
      page.cleanup();

      const categorie = categorieParPlat.get(cle) ?? null;
      fiches.push({
        page: i,
        titre,
        categorie,
        calories: trancheLaPlusProche(categorie, Number(part[1])),
        images,
      });
    }

    return fiches;
  } finally {
    await chargement.destroy();
  }
}
