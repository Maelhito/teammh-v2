#!/usr/bin/env node
/**
 * Vérification complète de tous les programmes categorie=n2 (les cycles) :
 * - avancement bien un cycle_N (jamais phase_N sous n2)
 * - grille non vide, cohérente (semaines/jours présents)
 * - chaque bloc a des instructions non vides
 * - aucune mention {{...}} non résolue restée dans le texte
 * - chaque span data-ex-id pointe vers un exercice qui existe ET a une vidéo
 * - rich_exercices / tabata_exercices cohérents avec les spans réellement présents
 * - bloc échauffement : contient bien la ligne CLIC SUR LA VIDÉO
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, cle, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: exercices, error: errEx } = await db.from("exercises").select("id, nom, video_url");
if (errEx) { console.error(errEx.message); process.exit(1); }
const exercicesParId = new Map((exercices ?? []).map(e => [e.id, e]));

const { data: programmes, error: errProg } = await db.from("programmes").select("*").eq("categorie", "n2");
if (errProg) { console.error(errProg.message); process.exit(1); }

console.log(`\n${programmes.length} programme(s) categorie=n2 trouvé(s) en base.\n`);

let problemes = 0;
const rapport = [];

for (const prog of programmes) {
  const pb = [];
  let desc;
  try { desc = JSON.parse(prog.description); } catch (e) { pb.push(`description JSON invalide : ${e.message}`); }

  if (desc) {
    if (!desc.avancement || !desc.avancement.startsWith("cycle_")) {
      pb.push(`avancement="${desc.avancement}" — attendu un cycle_N puisque categorie=n2`);
    }
    if (desc.avancement?.startsWith("cycle_") && !desc.cycle_prog) {
      pb.push(`cycle_prog absent alors que avancement="${desc.avancement}"`);
    }

    const grid = desc.grid ?? {};
    const cases = Object.keys(grid);
    if (cases.length === 0) {
      pb.push(`grille vide — aucune séance placée`);
    }

    const seancesVues = new Set();
    for (const [cle, items] of Object.entries(grid)) {
      if (!Array.isArray(items) || items.length === 0) { pb.push(`case ${cle} vide dans la grille`); continue; }
      for (const item of items) {
        if (item.type !== "seance_locale") continue; // vidéo libre, repos, etc. — hors périmètre
        const sd = item.seanceData;
        if (!sd) { pb.push(`case ${cle} : seance_locale sans seanceData`); continue; }
        const seanceLabel = `${sd.nom} (case ${cle})`;
        if (!Array.isArray(sd.blocs) || sd.blocs.length === 0) {
          pb.push(`${seanceLabel} : aucun bloc`);
          continue;
        }
        for (const bloc of sd.blocs) {
          const blocLabel = `${seanceLabel} / bloc "${bloc.nom}"`;
          const instr = bloc.instructions ?? "";
          if (!instr.trim()) { pb.push(`${blocLabel} : instructions vides`); continue; }
          if (/\{\{[^}]+\}\}/.test(instr)) {
            pb.push(`${blocLabel} : mention {{...}} non résolue dans le texte final`);
          }
          if (bloc.type === "echauffement" && !instr.includes("CLIC SUR LA VIDÉO D")) {
            pb.push(`${blocLabel} : ligne "CLIC SUR LA VIDÉO..." absente de l'échauffement`);
          }
          // Spans data-ex-id présents dans le HTML
          const idsDansTexte = [...instr.matchAll(/data-ex-id="([^"]+)"/g)].map(m => m[1]);
          for (const id of idsDansTexte) {
            const ex = exercicesParId.get(id);
            if (!ex) { pb.push(`${blocLabel} : exercice id=${id} référencé mais absent de la bibliothèque`); }
            else if (!ex.video_url) { pb.push(`${blocLabel} : exercice "${ex.nom}" sans vidéo (video_url vide)`); }
          }
          // Cohérence rich_exercices / tabata_exercices vs spans du texte
          const idsListe = (bloc.format === "tabata" ? bloc.tabata_exercices : bloc.rich_exercices) ?? [];
          const idsListeSet = new Set(idsListe.map(x => x.exercise_id ?? x.exercise?.id).filter(Boolean));
          const idsTexteSet = new Set(idsDansTexte);
          for (const id of idsTexteSet) {
            if (!idsListeSet.has(id)) pb.push(`${blocLabel} : exercice ${id} dans le texte mais absent de ${bloc.format === "tabata" ? "tabata_exercices" : "rich_exercices"}`);
          }
          for (const id of idsListeSet) {
            if (!idsTexteSet.has(id)) pb.push(`${blocLabel} : exercice ${id} listé dans ${bloc.format === "tabata" ? "tabata_exercices" : "rich_exercices"} mais absent du texte`);
          }
        }
        seancesVues.add(sd.nom);
      }
    }
  }

  if (pb.length) {
    problemes += pb.length;
    rapport.push({ prog, pb });
  }
}

if (rapport.length === 0) {
  console.log("✓ Tous les programmes N2 sont opérationnels — aucune anomalie détectée.\n");
} else {
  console.log(`✕ ${rapport.length} programme(s) avec anomalie(s), ${problemes} problème(s) au total :\n`);
  for (const { prog, pb } of rapport) {
    console.log(`━━━ ${prog.nom} (niveau ${prog.niveau}) — id ${prog.id} ━━━`);
    for (const p of pb) console.log(`  ✕ ${p}`);
    console.log();
  }
}
