#!/usr/bin/env node
/**
 * Rattrapage du suivi Time To Live pour les clientes DÉJÀ en TTL.
 *
 * Le webhook Stripe n'enregistre début/fin que lors du prochain événement de
 * chaque cliente. Ce script comble le passé :
 *   - début TTL  = date_debut de son offre TTL dans l'app (offres_clientes)
 *   - statut     = d'après son abonnement (ttl_subscriptions)
 *   - Notion     = fiche retrouvée par EMAIL, statut + Début TTL (+ Fin TTL)
 *
 * ATTENTION : .env.local pointe sur la BASE DE PRODUCTION (et NOTION_API_KEY
 * doit y figurer). Essai à blanc par défaut ; rien n'est écrit sans --ecrire.
 *
 *   node scripts/ttl-rattrapage-suivi.mjs            → essai à blanc
 *   node scripts/ttl-rattrapage-suivi.mjs --ecrire   → écrit vraiment
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function chargerEnv(chemin) {
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
chargerEnv(new URL("../.env.local", import.meta.url).pathname);

const ECRIRE = process.argv.includes("--ecrire");
const BASE_NOTION = "30b6b6b920ae81fe9dbefafe9cb8bc06";
const TERMINES = new Set(["canceled", "unpaid", "incomplete_expired"]);

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: cle, NOTION_API_KEY: notionKey } = process.env;
if (!url || !cle) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de .env.local");
  process.exit(1);
}
if (!notionKey) console.warn("⚠ NOTION_API_KEY absent de .env.local : la partie Notion sera ignorée.\n");

const db = createClient(url, cle, { auth: { autoRefreshToken: false, persistSession: false } });

const jourNoumea = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Pacific/Noumea" });

async function notion(chemin, method, body) {
  const res = await fetch(`https://api.notion.com/v1${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${notionKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion ${res.status} ${await res.text()}`);
  return res.json();
}

async function trouverFiche(email) {
  for (const c of new Set([email, email.toLowerCase()])) {
    const json = await notion(`/databases/${BASE_NOTION}/query`, "POST", {
      filter: { property: "Email", email: { equals: c } },
      page_size: 2,
    });
    if (json.results.length) return json.results[0].id;
  }
  return null;
}

const { data: offres, error } = await db.from("offres_clientes").select("user_id, date_debut").eq("offre", "TTL");
if (error) { console.error(error.message); process.exit(1); }
const { data: abos } = await db.from("ttl_subscriptions").select("*");
const aboParUser = new Map((abos ?? []).map((a) => [a.user_id, a]));

console.log(`${offres.length} cliente(s) en offre TTL — ${ECRIRE ? "ÉCRITURE" : "essai à blanc"}\n`);

for (const o of offres) {
  const { data: u } = await db.auth.admin.getUserById(o.user_id);
  const email = u?.user?.email;
  const abo = aboParUser.get(o.user_id);
  const debut = abo?.started_at ?? (o.date_debut ? new Date(o.date_debut + "T12:00:00+11:00").toISOString() : null);
  const arrete = !!abo && TERMINES.has(abo.status);
  const fin = arrete ? (abo.ended_at ?? abo.updated_at) : null;

  let notionTxt = "pas de NOTION_API_KEY";
  let pageId = null;
  if (notionKey && email) {
    pageId = await trouverFiche(email);
    notionTxt = pageId ? "fiche Notion trouvée" : "⚠ AUCUNE fiche Notion avec cet email";
  } else if (!email) notionTxt = "⚠ pas d'email";

  console.log(
    `${email ?? o.user_id} | début ${debut ? jourNoumea(debut) : "?"} | ${arrete ? "ARRÊTÉE " + jourNoumea(fin) : "en cours"} | stripe: ${abo?.status ?? "aucun abonnement"} | ${notionTxt}`
  );

  if (!ECRIRE) continue;

  if (abo && !abo.started_at && debut) {
    await db.from("ttl_subscriptions").update({ started_at: debut }).eq("user_id", o.user_id);
  }
  if (abo && arrete && !abo.ended_at && fin) {
    await db.from("ttl_subscriptions").update({ ended_at: fin }).eq("user_id", o.user_id);
  }
  if (pageId) {
    const properties = {
      "Statut Détaillé": { status: { name: arrete ? "Time To Live arrêté" : "Time To Live" } },
      "Fin TTL": { date: arrete && fin ? { start: jourNoumea(fin) } : null },
    };
    if (debut) properties["Début TTL"] = { date: { start: jourNoumea(debut) } };
    await notion(`/pages/${pageId}`, "PATCH", { properties });
  }
}
console.log(ECRIRE ? "\nTerminé." : "\nEssai à blanc terminé : rien n'a été écrit. Relancer avec --ecrire pour appliquer.");
