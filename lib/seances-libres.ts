import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeanceData } from "./seance-format";
import { dateToGridKey, parseLocalDate, toLocalDateStr } from "./programme-planning";

// ─── Séances libres ───────────────────────────────────────────────────────────
// Tout le parcours séance de la cliente (calendrier, « Mes séances », lecteur,
// validation, série, édition coach) lit la grille d'une assignation
// (client_programmes.grid_data). Une séance posée seule dans calendar_events
// n'avait qu'un titre : la cliente ne pouvait ni l'ouvrir ni la valider, et le
// coach ne pouvait pas toucher à ses exercices.
//
// Une séance libre est donc une case de grille comme les autres, rangée dans
// une assignation dédiée « Séances libres » (une par cliente), adossée à un
// template caché partagé. La grille démarre le lundi de la première séance
// libre et s'allonge au fil des ajouts.

export const CATEGORIE_SEANCES_LIBRES = "seances_libres";
export const NOM_SEANCES_LIBRES = "Séances libres";

/** Le template caché, sans le créer. */
export async function templateSeancesLibres(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin
    .from("programmes")
    .select("id")
    .eq("categorie", CATEGORIE_SEANCES_LIBRES)
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function templateSeancesLibresOuCree(admin: SupabaseClient): Promise<string> {
  const existant = await templateSeancesLibres(admin);
  if (existant) return existant;
  const { data, error } = await admin
    .from("programmes")
    .insert({
      nom: NOM_SEANCES_LIBRES,
      categorie: CATEGORIE_SEANCES_LIBRES,
      niveau: null,
      duree_semaines: 1,
      description: JSON.stringify({ grid: {}, duree_semaines: 1 }),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Template « Séances libres » impossible à créer");
  return data.id;
}

function lundiDe(d: Date): Date {
  const l = new Date(d);
  l.setHours(0, 0, 0, 0);
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

/** Décale une clé « S{n}_J{j} » de `semaines` semaines. */
function decalerCle(key: string, semaines: number): string {
  const m = key.match(/^S(\d+)_J(\d+)$/);
  return m ? `S${parseInt(m[1]) + semaines}_J${m[2]}` : key;
}

/**
 * Pose une séance dans la grille « Séances libres » de la cliente, à la date
 * donnée (« YYYY-MM-DD », jour local de la cliente).
 *
 * La séance y est COPIÉE (« seance_locale ») depuis la bibliothèque : le coach
 * peut alors voir et adapter ses exercices pour cette cliente seule, sans
 * toucher à la séance d'origine.
 */
export async function ajouterSeanceLibre(
  admin: SupabaseClient,
  clientId: string,
  seance: { nom: string; duree: number | null; seanceData: SeanceData },
  date: string,
): Promise<{ assignmentId: string; gridKey: string }> {
  const templateId = await templateSeancesLibresOuCree(admin);
  const jour = parseLocalDate(date);
  const item = {
    _key: `libre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "seance_locale",
    nom: seance.nom,
    duree: seance.duree,
    seanceData: seance.seanceData,
  };

  const { data: rows } = await admin
    .from("client_programmes")
    .select("id, date_debut, grid_data, statut")
    .eq("user_id", clientId)
    .eq("programme_id", templateId)
    .order("created_at", { ascending: true })
    .limit(1);
  const existant = rows?.[0];

  if (!existant) {
    const debut = lundiDe(jour);
    const gridKey = dateToGridKey(jour, debut)!;
    const { data, error } = await admin
      .from("client_programmes")
      .insert({
        user_id: clientId,
        programme_id: templateId,
        date_debut: toLocalDateStr(debut),
        statut: "en_cours",
        grid_data: JSON.stringify({ grid: { [gridKey]: [item] }, duree_semaines: 1, seances_terminees: [] }),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Assignation « Séances libres » impossible à créer");
    return { assignmentId: data.id, gridKey };
  }

  let gridData: Record<string, unknown> = {};
  try { if (existant.grid_data?.startsWith("{")) gridData = JSON.parse(existant.grid_data); } catch {}
  let grid = (gridData.grid as Record<string, unknown[]> | undefined) ?? {};
  let duree = typeof gridData.duree_semaines === "number" ? gridData.duree_semaines : 1;
  let debut = parseLocalDate(existant.date_debut);

  // Séance avant le début de la grille : on recule le début d'autant de
  // semaines, et on renumérote tout (grille, validations, journal) pour que
  // chaque séance déjà posée garde son jour.
  if (jour < debut) {
    const nouveauDebut = lundiDe(jour);
    const recul = Math.round((debut.getTime() - nouveauDebut.getTime()) / (7 * 86_400_000));
    grid = Object.fromEntries(Object.entries(grid).map(([k, v]) => [decalerCle(k, recul), v]));
    for (const champ of ["seances_terminees", "taches_done"]) {
      if (Array.isArray(gridData[champ])) gridData[champ] = (gridData[champ] as string[]).map(k => decalerCle(k, recul));
    }
    const { data: logs } = await admin
      .from("seances_log")
      .select("id, grid_key")
      .eq("assignment_id", existant.id);
    for (const log of logs ?? []) {
      if (!log.grid_key) continue;
      await admin.from("seances_log").update({ grid_key: decalerCle(log.grid_key, recul) }).eq("id", log.id);
    }
    duree += recul;
    debut = nouveauDebut;
  }

  const gridKey = dateToGridKey(jour, debut)!;
  const semaine = parseInt(gridKey.match(/^S(\d+)/)![1]);
  if (semaine > duree) duree = semaine;
  grid[gridKey] = [...(grid[gridKey] ?? []), item];

  const { error } = await admin
    .from("client_programmes")
    .update({
      date_debut: toLocalDateStr(debut),
      // Une grille dont toutes les séances étaient faites s'est close toute
      // seule : la nouvelle séance la rouvre.
      statut: "en_cours",
      grid_data: JSON.stringify({ ...gridData, grid, duree_semaines: duree }),
    })
    .eq("id", existant.id);
  if (error) throw new Error(error.message);
  return { assignmentId: existant.id, gridKey };
}
