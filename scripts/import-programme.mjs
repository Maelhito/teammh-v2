#!/usr/bin/env node
/**
 * Import d'un programme complet dans TTM — séances, blocs et exercices compris.
 *
 * Écrit une seule ligne dans `programmes` : les séances vivent dans la grille
 * du programme (type "seance_locale"), exactement comme quand elles sont créées
 * depuis le builder. Elles s'ouvrent donc normalement côté coach, et côté
 * cliente app/entrainement les lit sans conversion.
 *
 * Le texte de chaque bloc (`texte`) est celui que verra la cliente, tel quel —
 * espaces, tirets, retours à la ligne compris. Un exercice cité dans le texte
 * s'écrit `{{Nom exact}}` : le script le remplace par le même span rouge/gras
 * que produit l'éditeur du coach quand il tape « # » (mêmes attributs data-ex-*),
 * pour que l'exercice soit cliquable (ouvre sa vidéo) et apparaisse dans
 * « Mouvements » — sans passer par une liste séparée qui romprait le style
 * Azeoo (texte continu, tirets, "Min 1 : ...") que les clientes connaissent.
 *
 * Les exercices cités sont retrouvés dans la bibliothèque `exercises` par leur
 * nom (accents et casse ignorés). Un nom qui correspond à PLUSIEURS exercices
 * bloque tout l'import (bibliothèque de 300+ vidéos : jamais deviner). Un nom
 * qui ne correspond à AUCUN exercice est créé.
 *
 * ATTENTION : .env.local pointe sur la BASE DE PRODUCTION. D'où l'essai à
 * blanc par défaut ; rien n'est écrit sans --ecrire.
 *
 *   node scripts/import-programme.mjs import/mon-prog.json            → essai à blanc
 *   node scripts/import-programme.mjs import/mon-prog.json --ecrire   → écrit vraiment
 *
 * Mettre un champ top-level "id" (uuid d'un programme déjà en base) fait UPDATE
 * ce programme au lieu d'en créer un nouveau — pour corriger un import déjà écrit
 * sans dupliquer la ligne ni changer son URL.
 *
 * ── Format du fichier JSON ────────────────────────────────────────────────────
 * {
 *   "id": "05af635d-...",           // optionnel : met à jour ce programme au lieu d'en créer un
 *   "nom": "Cycle 1 · Prog 1",
 *   "categorie": "n1",              // n1 | n2 | ""
 *   "avancement": "cycle_1",        // phase_0..phase_4 | cycle_1..cycle_4 | ""
 *   "cycle_prog": "prog_1",         // prog_1 | prog_2   (seulement si cycle)
 *   "niveau": "debutant",           // debutant | intermediaire | avance
 *   "duree_semaines": 6,
 *   "note": "",
 *   "seances": [
 *     {
 *       "nom": "Séance 1",
 *       "categorie": "full_body",   // full_body | bas_du_corps | haut_du_corps | stretching
 *       "duree_estimee": 45,
 *       "note": "",
 *       "semaines": [1, 2, 3],      // les semaines où la séance revient
 *       "jours": [1],               // 1 = Lundi … 7 = Dimanche
 *       "blocs": [
 *         {
 *           "type": "echauffement", // echauffement | corps | finisher
 *           "nom": "WARM UP",
 *           "format": "classique",  // classique | tabata | emom | amrap | for_time
 *           "type_score": "",       // reps | charge | temps | rounds_reps | distance | calories
 *           "amrap_duree": "12", "for_time_limit": "20",
 *           "emom_rounds": "10", "emom_interval_min": "1", "emom_interval_sec": "0",
 *           "tabata_work": "20", "tabata_rest": "10", "tabata_tours": "8",
 *           "texte": "Consigne : ...\n\nEnchaîne 4 tours :\n\n- {{Burpees}}\n- {{Air squat}}"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ─── Environnement ────────────────────────────────────────────────────────────
function chargerEnv(chemin) {
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, "utf8").split("\n")) {
    const m = ligne.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
chargerEnv(new URL("../.env.local", import.meta.url).pathname);

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Même normalisation que lib/recherche.ts : « Élévations » se retrouve avec « elevations ». */
function normaliserTexte(s) {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
let _k = 0;
const nk = () => `ci${++_k}_${Date.now()}`;
const gridKey = (s, j) => `S${s}_J${j}`;
const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const BLOC_NOM_DEFAUT = { echauffement: "WARM UP", corps: "WOD", finisher: "COOL DOWN" };

function echapperHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Même span que fait l'éditeur du coach en tapant « # » (RichTextEditor.makeExerciseSpan
 *  dans app/coach/seances/SeanceBuilder.tsx) : mêmes attributs data-ex-*, donc le clic ouvre
 *  la vidéo côté cliente et l'exercice apparaît dans le rail « Mouvements » du builder. */
function spanExercice(ex) {
  const thumb = ex.miniature_url || "";
  return `<span contenteditable="false" data-ex-id="${ex.id}" data-ex-nom="${echapperHtml(ex.nom)}" data-ex-video="${echapperHtml(ex.video_url || "")}" data-ex-groupe="${echapperHtml(ex.groupe_musculaire || "")}" data-ex-thumb="${echapperHtml(thumb)}" style="color:#B22222;font-weight:800;cursor:pointer;user-select:none;">${echapperHtml(ex.nom)}</span>`;
}

/** Convertit `texte` (avec des mentions `{{Nom exact}}`) en :
 *   - `html`      → à stocker dans `instructions`, une <div> par ligne (comme
 *                    le fait le navigateur dans l'éditeur contentEditable),
 *                    pour que les sauts de ligne survivent même sans
 *                    `white-space: pre-wrap` côté lecteur cliente.
 *   - `mentions`   → liste ordonnée, dédoublonnée, des exercices résolus cités
 *                    (alimente rich_exercices ou tabata_exercices).
 *   - `inconnues`  → noms cités qui ne correspondent à rien de sûr dans la
 *                    bibliothèque (bloque l'import, cf. plus bas).
 */
function texteVersHtml(texte, resoudre) {
  const mentions = [];
  const vus = new Set();
  const inconnues = [];

  const lignesHtml = String(texte ?? "").split("\n").map(ligne => {
    if (ligne === "") return "<div><br></div>";
    let out = "";
    let reste = ligne;
    const re = /\{\{([^}]+)\}\}/g;
    let dernier = 0;
    let m;
    while ((m = re.exec(ligne))) {
      out += echapperHtml(ligne.slice(dernier, m.index));
      const { ex, ambigu } = resoudre(m[1]);
      if (ambigu) { inconnues.push({ nom: m[1], candidats: ambigu }); out += echapperHtml(m[1]); }
      else if (ex) {
        out += spanExercice(ex);
        const k = ex.id || normaliserTexte(ex.nom);
        if (!vus.has(k)) { vus.add(k); mentions.push(ex); }
      } else { out += echapperHtml(m[1]); }
      dernier = re.lastIndex;
    }
    out += echapperHtml(ligne.slice(dernier));
    reste = out;
    return `<div>${reste}</div>`;
  });

  return { html: lignesHtml.join(""), mentions, inconnues };
}

/** Un bloc complet : le builder relit toutes ces clés, une seule manquante
 *  et le bloc s'ouvre avec des champs vides au lieu des valeurs voulues. */
function construireBloc(b) {
  const format = b.format ?? "classique";
  return {
    _texte: b.texte ?? "",                // retiré après résolution des exercices
    _key: nk(),
    type: b.type ?? "corps",
    nom: b.nom ?? BLOC_NOM_DEFAUT[b.type ?? "corps"] ?? "Bloc",
    format,
    instructions: "",
    type_score: b.type_score ?? "",
    note_bloc: b.note_bloc ?? "",
    tabata_work: String(b.tabata_work ?? "20"),
    tabata_rest: String(b.tabata_rest ?? "10"),
    tabata_tours: String(b.tabata_tours ?? "8"),
    tabata_exercices: [],
    emom_rounds: String(b.emom_rounds ?? "10"),
    emom_interval_min: String(b.emom_interval_min ?? "1"),
    emom_interval_sec: String(b.emom_interval_sec ?? "0"),
    amrap_duree: String(b.amrap_duree ?? "10"),
    for_time_limit: String(b.for_time_limit ?? "20"),
    rich_exercices: [],
  };
}

// ─── Programme principal ──────────────────────────────────────────────────────
const fichier = process.argv[2];
const ecrire = process.argv.includes("--ecrire");

if (!fichier) {
  console.error("Usage : node scripts/import-programme.mjs <fichier.json> [--ecrire]");
  process.exit(1);
}
if (!existsSync(fichier)) {
  console.error(`Fichier introuvable : ${fichier}`);
  process.exit(1);
}

const p = JSON.parse(readFileSync(fichier, "utf8"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de .env.local");
  process.exit(1);
}
const db = createClient(url, cle, { auth: { autoRefreshToken: false, persistSession: false } });

// 1. Bibliothèque d'exercices existante
const { data: biblio, error: errBiblio } = await db.from("exercises").select("*");
if (errBiblio) { console.error("Lecture de la bibliothèque impossible :", errBiblio.message); process.exit(1); }

const parNom = new Map();
for (const ex of biblio ?? []) parNom.set(normaliserTexte(ex.nom), ex);

const aCreer = new Map();   // nom normalisé → nom
/** Retrouve un exercice par son nom cité dans `{{...}}` : correspondance exacte,
 *  sinon un unique exercice dont le nom contient la saisie. Deux candidats ou
 *  plus = on ne devine pas, l'import s'arrête (cf. rapport plus bas). Un nom
 *  sans aucune correspondance est marqué à créer. */
function resoudre(nom) {
  const q = normaliserTexte(nom);
  if (parNom.has(q)) return { ex: parNom.get(q) };
  const proches = [...parNom.values()].filter(e => normaliserTexte(e.nom).includes(q));
  if (proches.length === 1) return { ex: proches[0] };
  if (proches.length > 1) return { ex: null, ambigu: proches.map(e => e.nom) };
  if (!aCreer.has(q)) aCreer.set(q, nom);
  return { ex: null };
}

// 2. Construction des séances : chaque bloc résout son texte en HTML + mentions
const seances = (p.seances ?? []).map(s => ({
  ...s,
  blocs: (s.blocs ?? []).map(construireBloc),
}));

const ambiguites = [];  // { nom, candidats }[]

for (const s of seances) {
  for (const b of s.blocs) {
    const { html, mentions, inconnues } = texteVersHtml(b._texte, resoudre);
    b._htmlBrut = html;
    b._mentions = mentions;
    ambiguites.push(...inconnues);
  }
}

// 3. Récapitulatif lisible — le texte affiché est celui qui ira dans l'app, tel quel.
const totalCases = seances.reduce((a, s) => a + (s.semaines ?? [1]).length * (s.jours ?? [s.jour ?? 1]).length, 0);
console.log(`\n━━━ ${p.nom} ━━━`);
console.log(`Niveau ${p.niveau ?? "debutant"} · ${p.duree_semaines ?? 4} semaines · ${seances.length} séance(s) distincte(s) → ${totalCases} case(s) dans la grille\n`);
for (const s of seances) {
  const sem = s.semaines ?? [1];
  const jrs = (s.jours ?? [s.jour ?? 1]).map(j => JOURS[j]).join(", ");
  console.log(`  ▸ ${s.nom}  —  semaines ${sem.join(", ")} · ${jrs} · ${s.duree_estimee ?? 45} min`);
  for (const b of s.blocs) {
    console.log(`\n      [${b.nom}] ${b.format}`);
    for (const ligne of b._texte.split("\n")) console.log(`      │ ${ligne}`);
  }
  console.log();
}
if (aCreer.size) {
  console.log(`  Exercices absents de la bibliothèque, ils seront créés (${aCreer.size}) :`);
  for (const nom of aCreer.values()) console.log(`   + ${nom}`);
  console.log();
}

if (ambiguites.length) {
  console.log(`  ✕ NOMS AMBIGUS — précise le nom exact dans le fichier, rien ne sera écrit :`);
  for (const a of ambiguites) {
    console.log(`\n   « ${a.nom} » correspond à ${a.candidats.length} exercices :`);
    for (const c of a.candidats.slice(0, 12)) console.log(`       · ${c}`);
    if (a.candidats.length > 12) console.log(`       … et ${a.candidats.length - 12} autres`);
  }
  console.log();
  process.exit(1);
}

if (!ecrire) {
  console.log(`ESSAI À BLANC — rien n'a été écrit.`);
  console.log(`Pour écrire vraiment :  node ${process.argv[1].split("/").pop()} ${fichier} --ecrire\n`);
  process.exit(0);
}

// 4. Création des exercices manquants, puis re-résolution du texte (les
//    mentions vers un exercice tout juste créé échouaient sinon).
if (aCreer.size) {
  const lignes = [...aCreer.values()].map(nom => ({
    nom, groupe_musculaire: "À classer", materiel: "aucun", type_format: "classique",
  }));
  const { data: crees, error } = await db.from("exercises").insert(lignes).select();
  if (error) { console.error("\nCréation des exercices impossible :", error.message); process.exit(1); }
  for (const ex of crees ?? []) parNom.set(normaliserTexte(ex.nom), ex);
  console.log(`${crees.length} exercice(s) créé(s).`);
  for (const s of seances) {
    for (const b of s.blocs) {
      const { html, mentions } = texteVersHtml(b._texte, resoudre);
      b._htmlBrut = html;
      b._mentions = mentions;
    }
  }
}

// 5. Remplissage des blocs : `instructions` porte le texte tel qu'écrit (avec
//    les exercices en spans cliquables), et rich_exercices/tabata_exercices
//    sont dérivés des MÊMES mentions — jamais une liste saisie à côté, sinon
//    les deux peuvent diverger comme dans la bibliothèque de l'éditeur coach.
for (const s of seances) {
  for (const b of s.blocs) {
    b.instructions = b._htmlBrut;
    if (b.format === "tabata") {
      b.tabata_exercices = b._mentions.map(ex => ({
        _key: nk(), exercise_id: ex.id, exercise: ex,
        series: "", tabata_work: b.tabata_work, tabata_rest: b.tabata_rest, notes: "",
      }));
    } else {
      b.rich_exercices = b._mentions.map(ex => ({ _key: `desc_${ex.id}`, exercise: ex }));
    }
    delete b._texte; delete b._htmlBrut; delete b._mentions;
  }
}

// 6. Grille : une même séance répétée partage un groupId, sinon l'éditer
//    n'en modifierait qu'une copie.
const grid = {};
for (const s of seances) {
  const groupId = nk();
  const seanceData = {
    nom: s.nom,
    categorie: s.categorie ?? "full_body",
    niveau: p.niveau ?? "debutant",
    duree_estimee: String(s.duree_estimee ?? 45),
    note: s.note ?? "",
    blocs: s.blocs,
  };
  for (const sem of s.semaines ?? [1]) {
    for (const j of s.jours ?? [s.jour ?? 1]) {
      const k = gridKey(sem, j);
      (grid[k] ??= []).push({
        _key: nk(), groupId, type: "seance_locale",
        nom: s.nom, duree: s.duree_estimee ?? null, seanceData,
      });
    }
  }
}

// 7. Écriture du programme (création, ou mise à jour si `id` est fourni)
const description = JSON.stringify({
  grid,
  note: p.note ?? "",
  duree_semaines: p.duree_semaines ?? 4,
  avancement: p.avancement ?? "",
  cycle_prog: p.avancement?.startsWith("cycle_") ? (p.cycle_prog ?? "") : "",
});

const ligne = {
  nom: p.nom,
  categorie: p.categorie ?? "",
  niveau: p.niveau ?? "debutant",
  duree_semaines: p.duree_semaines ?? 4,
  description,
};

const req = p.id
  ? db.from("programmes").update(ligne).eq("id", p.id).select().single()
  : db.from("programmes").insert(ligne).select().single();

const { data: prog, error: errProg } = await req;

if (errProg) { console.error("\nÉcriture du programme impossible :", errProg.message); process.exit(1); }

console.log(`\n✓ Programme ${p.id ? "mis à jour" : "créé"} : ${prog.nom}`);
console.log(`  /coach/programmes/${prog.id}\n`);
