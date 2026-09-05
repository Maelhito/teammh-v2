// Régénère import/exercices-bibliotheque.txt : la liste des noms exacts de la
// bibliothèque, référence obligatoire avant tout import (un nom approximatif
// crée un doublon dans une bibliothèque de 300+ vidéos).
//   node scripts/exercices-liste.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await db.from("exercises").select("nom, groupe_musculaire").order("nom");
writeFileSync("import/exercices-bibliotheque.txt",
  data.map(e => e.nom).join("\n") + "\n");
console.log("Liste écrite : import/exercices-bibliotheque.txt (" + data.length + " exercices)");
