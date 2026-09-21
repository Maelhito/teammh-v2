/**
 * Moteur du guide des équivalences : recherche, calcul des grammages et
 * classement des alternatives.
 *
 * Portage fidèle de la logique de l'artefact de Julie : mêmes formules, mêmes
 * tolérances, mêmes classements. Seul le rendu change (données structurées au
 * lieu de HTML), pour être affiché par composants/GuideEquivalences.
 */

import { CATEGORIES, DATA, type AlimentEq, type TableauEq } from "./donnees";

export type Bande = "vertfonce" | "vertclair" | "jaune" | "rouge";

export interface LigneNutri {
  valeur: string;
  libelle: string;
}

export interface AlternativeEq {
  nom: string;
  note?: string;
  quantite: string;
  unite: string;
  bande: Bande | null;
  bandeLibelle: string | null;
  nutri: LigneNutri[];
}

export interface TableauResultat {
  titre: string;
  meta: string;
  reference: {
    quantite: string;
    unite: string;
    kcalTotal: number | null;
    baseDuGuide: boolean;
    bande: Bande | null;
    nutri: LigneNutri[];
  } | null;
  alternatives: AlternativeEq[];
}

export interface ResultatRecherche {
  nom: string;
  icone: string;
  sansQuantite: boolean;
  tableaux: TableauResultat[];
}

export interface GroupeParcours {
  libelle: string;
  aliments: { nom: string; valeur: string; bande: Bande | null; bandeLibelle: string | null }[];
}

export function iconeCategorie(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.icon ?? "•";
}

export function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function formatNombre(n: number): string {
  if (Math.abs(n) < 10) return (Math.round(n * 10) / 10).toString().replace(".", ",");
  return Math.round(n).toString();
}

// Code couleur de densité calorique, celui du tableur de la coach :
// < 100 kcal = vert foncé · 100-150 = vert clair · 150-250 = jaune · 250+ = rouge
export function bandeKcal(kcal: number): Bande {
  if (kcal < 100) return "vertfonce";
  if (kcal < 150) return "vertclair";
  if (kcal < 250) return "jaune";
  return "rouge";
}

function libelleBande(kcal: number): string {
  if (kcal < 100) return `${kcal} kcal/100g — moins de 100 kcal`;
  if (kcal < 150) return `${kcal} kcal/100g — 100 à 150 kcal`;
  if (kcal < 250) return `${kcal} kcal/100g — 150 à 250 kcal`;
  return `${kcal} kcal/100g — plus de 250 kcal`;
}

function valeurRamenee(pour100g: number, quantite: number): string {
  return formatNombre((pour100g * quantite) / 100);
}

/**
 * Petite ligne nutritionnelle affichée à côté d'un aliment, ramenée à la
 * quantité affichée. Pour légumes/fruits/légumineuses/féculents, seules
 * protéines (légumineuses et féculents), fibres et glucides sont montrés.
 */
function ligneNutri(it: AlimentEq, quantite: number): LigneNutri[] {
  const l: LigneNutri[] = [];
  const prot = () => { if (it.prot !== undefined) l.push({ valeur: valeurRamenee(it.prot, quantite), libelle: "prot" }); };
  const fibres = () => { if (it.fiber !== undefined) l.push({ valeur: valeurRamenee(it.fiber, quantite), libelle: "fibres" }); };
  const glucides = () => { if (it.carbs !== undefined) l.push({ valeur: valeurRamenee(it.carbs, quantite), libelle: "glucides" }); };
  const lipides = () => { if (it.fat !== undefined) l.push({ valeur: valeurRamenee(it.fat, quantite), libelle: "lipides" }); };

  if (["legumes", "fruits", "legumineuses", "feculents"].includes(it.cat)) {
    if (it.cat === "legumineuses" || it.cat === "feculents") prot();
    fibres();
    glucides();
  } else if (it.cat === "laitiers" || it.cat === "fromages" || it.cat === "apero") {
    prot();
    lipides();
  } else if (it.cat === "lipides" && it.fiber !== undefined) {
    prot();
    fibres();
  } else if (it.cat === "sucre") {
    prot();
    fibres();
  } else {
    prot();
  }
  return l;
}

// Un même aliment peut figurer dans plusieurs tableaux.
const INDEX = new Map<string, { block: TableauEq; item: AlimentEq }[]>();
for (const block of DATA) {
  for (const item of block.items) {
    if (!INDEX.has(item.n)) INDEX.set(item.n, []);
    INDEX.get(item.n)!.push({ block, item });
  }
}
const TOUS_LES_NOMS = [...INDEX.keys()];

export function suggestions(saisie: string): { nom: string; icone: string }[] {
  const q = sansAccents(saisie.trim());
  if (!q) return [];
  return TOUS_LES_NOMS.filter((n) => sansAccents(n).includes(q))
    .slice(0, 10)
    .map((nom) => ({ nom, icone: iconeCategorie(INDEX.get(nom)![0].item.cat) }));
}

/** Nom exact, sinon premier aliment qui contient la saisie (sans accents). */
export function trouverAliment(saisie: string): string | null {
  const tape = saisie.trim();
  if (!tape) return null;
  if (INDEX.has(tape)) return tape;
  const q = sansAccents(tape);
  return TOUS_LES_NOMS.find((n) => sansAccents(n).includes(q)) ?? null;
}

function equivalent(block: TableauEq, ref: AlimentEq, autre: AlimentEq, quantite: number): number {
  if (block.mode === "kcal") return quantite * (ref.kcal! / autre.kcal!);
  return quantite * (autre.q! / ref.q!);
}

const LIBELLES_CROISES: Record<string, string> = {
  "prot-maigre": "Protéines maigres",
  "prot-migras": "Protéines mi-grasses",
  "prot-grasse": "Protéines grasses",
  "frais-yaourt": "Fromages frais & yaourts",
  "sucre-basiques-biscuits": "Produits sucrés",
};
const SUFFIXE_PROT = " — viandes, poissons, protéines végétales & œufs à ce palier";
const SUFFIXES_CROISES: Record<string, string> = {
  "prot-maigre": SUFFIXE_PROT,
  "prot-migras": SUFFIXE_PROT,
  "prot-grasse": SUFFIXE_PROT,
};
const META_CROISES: Record<string, string> = {
  "frais-yaourt": "Regroupe fromages frais/légers et yaourts, classés par proximité protéines + lipides.",
  "sucre-basiques-biscuits": "Regroupe basiques et biscuits/petites douceurs, classés par acides gras saturés + sucre.",
};

// Filtre de proximité protéique (g de protéines/100g autour de l'aliment cherché).
const TOLERANCE_PROT: Record<string, number> = {
  viandes: 6, poissons: 6, "proteines-vegetales": 6, oeufs: 6, laitiers: 3, fromages: 5,
};

const parNom = (a: AlimentEq, b: AlimentEq) => a.n.localeCompare(b.n, "fr");

function trierPar(items: AlimentEq[], score: (x: AlimentEq) => number) {
  items.sort((a, b) => {
    const sa = score(a), sb = score(b);
    return sa !== sb ? sa - sb : parNom(a, b);
  });
}

export function rechercher(nom: string, quantite: number | null): ResultatRecherche {
  const entrees = INDEX.get(nom)!;
  const aQuantite = quantite !== null && !isNaN(quantite) && quantite > 0;

  const tableaux = entrees.map(({ block, item }): TableauResultat => {
    const quantiteBase = block.mode === "kcal" ? 100 : item.q!;
    const refQty = aQuantite ? quantite! : quantiteBase;
    const refUnite = block.mode === "kcal" ? "g" : item.u!;

    // Réservoir d'alternatives : groupe croisé, paliers en cascade (un palier
    // pioche dans les paliers inférieurs, jamais l'inverse) ou inclusion à sens unique.
    let pool = block.items;
    let titre = block.title;
    let meta = block.meta;
    if (item.crossGroup) {
      pool = DATA.flatMap((b) => b.items.filter((it) => it.crossGroup === item.crossGroup));
      titre = `${LIBELLES_CROISES[item.crossGroup] || block.title}${SUFFIXES_CROISES[item.crossGroup] || ""}`;
      meta = META_CROISES[item.crossGroup] || "Regroupe automatiquement le bon palier (maigre / mi-gras / gras) dans chaque catégorie protéinée.";
    } else if (block.tierGroup) {
      const eligibles = DATA.filter((b) => b.tierGroup === block.tierGroup && b.tierLevel! <= block.tierLevel!)
        .sort((a, b) => a.tierLevel! - b.tierLevel!);
      pool = eligibles.flatMap((b) => b.items);
      const inferieurs = eligibles.filter((b) => b.tierLevel! < block.tierLevel!).map((b) => b.short || b.title);
      titre = inferieurs.length ? `${block.short || block.title} — inclut aussi : ${inferieurs.join(", ")}` : (block.short || block.title);
      meta = inferieurs.length ? "Ce groupe peut aussi piocher dans les groupes précédents listés ci-dessus, mais l'inverse n'est pas vrai." : block.meta;
    } else if (block.includesBlocks) {
      const inclus = block.includesBlocks.map((id) => DATA.find((b) => b.id === id)).filter((b): b is TableauEq => !!b);
      pool = block.items.concat(inclus.flatMap((b) => b.items));
      titre = `${block.short || block.title} — inclut aussi : ${inclus.map((b) => b.short || b.title).join(", ")}`;
      meta = (block.meta ? block.meta + " " : "") + "Ce groupe peut aussi piocher dans les groupes listés ci-dessus, mais l'inverse n'est pas vrai.";
    }

    let affiches = pool.filter((it) => it.n !== nom);
    const tolerance = TOLERANCE_PROT[item.cat];
    if (tolerance !== undefined && item.prot !== undefined) {
      affiches = affiches.filter((it) => it.prot !== undefined && Math.abs(it.prot - item.prot!) <= tolerance);
      meta = (meta ? meta + " " : "") + `Seules les alternatives à ± ${tolerance}g de protéines/100g de ${nom} (${item.prot}g/100g) sont affichées.`;
    }

    // Classements : comparés sur les quantités réellement affichées.
    const refFibres = item.fiber !== undefined ? (item.fiber * refQty) / 100 : undefined;
    const refProt = item.prot !== undefined ? (item.prot * refQty) / 100 : undefined;
    const refGlucides = item.carbs !== undefined ? (item.carbs * refQty) / 100 : undefined;

    if (["legumes", "fruits", "legumineuses"].includes(item.cat) && item.fiber !== undefined) {
      trierPar(affiches, (x) => {
        const amt = equivalent(block, item, x, refQty);
        let s = 0;
        s += (x.fiber !== undefined && refFibres !== undefined ? Math.abs((x.fiber * amt) / 100 - refFibres) : 50) * 3;
        s += (x.carbs !== undefined && refGlucides !== undefined ? Math.abs((x.carbs * amt) / 100 - refGlucides) : 20) * 1;
        const communes = x.vit && item.vit ? x.vit.filter((v) => item.vit!.includes(v)).length : 0;
        s -= communes * 4;
        return s;
      });
      meta = (meta ? meta + " " : "") + `Classé par proximité avec ${nom} (fibres en priorité, puis glucides, puis vitamines dominantes communes), comparées sur les quantités réelles affichées.`;
    } else if (item.cat === "feculents") {
      trierPar(affiches, (x) => {
        const amt = equivalent(block, item, x, refQty);
        const df = x.fiber !== undefined && refFibres !== undefined ? Math.abs((x.fiber * amt) / 100 - refFibres) : 20;
        const dp = x.prot !== undefined && refProt !== undefined ? Math.abs((x.prot * amt) / 100 - refProt) : 20;
        const dc = x.carbs !== undefined && refGlucides !== undefined ? Math.abs((x.carbs * amt) / 100 - refGlucides) : 40;
        return df * 2 + dp * 2 + dc * 1;
      });
      meta = (meta ? meta + " " : "") + `Classé par proximité avec ${nom} (fibres et protéines en priorité, puis glucides), comparées sur les quantités réelles affichées.`;
    } else if (item.cat === "laitiers" || item.cat === "fromages") {
      trierPar(affiches, (x) => {
        const dp = x.prot !== undefined && item.prot !== undefined ? Math.abs(x.prot - item.prot) : 20;
        const df = x.fat !== undefined && item.fat !== undefined ? Math.abs(x.fat - item.fat) : 40;
        return dp + df;
      });
      meta = (meta ? meta + " " : "") + `Classé par proximité avec ${nom} (protéines et lipides/100g).`;
    } else if (item.cat === "lipides" && block.id === "lip-oleagineux") {
      trierPar(affiches, (x) => {
        const dp = x.prot !== undefined && item.prot !== undefined ? Math.abs(x.prot - item.prot) : 20;
        const df = x.fiber !== undefined && item.fiber !== undefined ? Math.abs(x.fiber - item.fiber) : 20;
        return dp + df;
      });
      meta = (meta ? meta + " " : "") + `Classé par proximité avec ${nom} (protéines et fibres/100g).`;
    } else if (item.cat === "apero") {
      trierPar(affiches, (x) => (x.kcal !== undefined ? x.kcal : Infinity));
    } else if (item.cat === "sucre") {
      trierPar(affiches, (x) =>
        (x.satFat || 0) + (x.sugar || 0) + (x.ingCount || 0) * 3 + (x.firstSugar ? 15 : 0) - (x.prot || 0) * 3 - (x.fiber || 0) * 3
      );
      meta = (meta ? meta + " " : "") + "Classé par acides gras saturés + sucre/100g, ajusté selon la liste d'ingrédients, et pondéré par protéines et fibres/100g.";
    } else {
      affiches.sort(parNom);
    }

    const enKcal = block.mode === "kcal" && item.kcal !== undefined;
    return {
      titre,
      meta,
      reference: block.hideRefRow ? null : {
        quantite: formatNombre(refQty),
        unite: refUnite,
        kcalTotal: enKcal ? Math.round((refQty * item.kcal!) / 100) : null,
        baseDuGuide: !aQuantite,
        bande: enKcal ? bandeKcal(item.kcal!) : null,
        nutri: ligneNutri(item, refQty),
      },
      alternatives: affiches.map((it) => {
        const amt = equivalent(block, item, it, refQty);
        const avecKcal = block.mode === "kcal" && it.kcal !== undefined;
        return {
          nom: it.n,
          note: it.note,
          quantite: formatNombre(amt),
          unite: block.mode === "kcal" ? "g" : it.u!,
          bande: avecKcal ? bandeKcal(it.kcal!) : null,
          bandeLibelle: avecKcal ? libelleBande(it.kcal!) : null,
          nutri: ligneNutri(it, amt),
        };
      }),
    };
  });

  return { nom, icone: iconeCategorie(entrees[0].item.cat), sansQuantite: !aQuantite, tableaux };
}

/** Parcours d'une catégorie : aliments regroupés par sous-catégorie, sinon par tableau. */
export function parcourir(categorieId: string): GroupeParcours[] {
  const groupes = new Map<string, { mode: TableauEq["mode"]; items: AlimentEq[] }>();
  for (const block of DATA) {
    for (const it of block.items.filter((x) => x.cat === categorieId)) {
      const libelle = it.subcat || block.title;
      if (!groupes.has(libelle)) groupes.set(libelle, { mode: block.mode, items: [] });
      groupes.get(libelle)!.items.push(it);
    }
  }
  return [...groupes.entries()].map(([libelle, g]) => ({
    libelle,
    aliments: [...g.items].sort(parNom).map((it) => {
      const avecKcal = g.mode === "kcal" && it.kcal !== undefined;
      return {
        nom: it.n,
        valeur: g.mode === "kcal" ? `${it.kcal} kcal/100g` : `${formatNombre(it.q!)} ${it.u}`,
        bande: avecKcal ? bandeKcal(it.kcal!) : null,
        bandeLibelle: avecKcal ? libelleBande(it.kcal!) : null,
      };
    }),
  }));
}
