/**
 * Lecture des tâches d'une cliente — côté serveur uniquement (client admin).
 *
 * Partagé par l'accueil (`/api/taches`) et par le cron des notifications, pour
 * qu'ils répondent pareil à « quelles sont les tâches de ce jour-là ? ».
 */

import type { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { formatHeureDans, occurrenceLe } from "@/lib/temps";
import { libelleRythme, limiteDeVieTache } from "@/lib/taches";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export interface TacheBrute {
  id: string;
  titre: string;
  message: string | null;
  date: string;
  heure: string | null;
  starts_at: string | null;
  timezone: string | null;
  recurrence: string | null;
  recurrence_intervalle: number | null;
  created_at: string;
  fait_le: string | null;
}

export interface TacheDuJour {
  id: string;
  titre: string;
  message: string | null;
  done: boolean;
  recurrente: boolean;
  /** « Tous les jours », « Toutes les 2 semaines »… ; null si tâche unique. */
  rythme: string | null;
  /** HH:MM chez la cliente, ou null si la tâche n'a pas d'heure. */
  heure: string | null;
  /** L'instant exact de l'occurrence de ce jour, quand la tâche a une heure. */
  instant: Date | null;
}

export async function lireTachesBrutes(admin: Admin, userId: string): Promise<TacheBrute[]> {
  const { data } = await admin
    .from("calendar_events")
    .select("id, titre, message, date, heure, starts_at, timezone, recurrence, recurrence_intervalle, created_at, fait_le")
    .eq("target_user_id", userId)
    .eq("event_type", "tache")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as TacheBrute[];
}

export const estRecurrente = (t: Pick<TacheBrute, "recurrence">) => !!t.recurrence && t.recurrence !== "none";

/** Les couples « tâche|jour » déjà validés parmi ces tâches récurrentes et ces jours. */
export async function lireValidations(admin: Admin, ids: string[], jours: string[]): Promise<Set<string>> {
  if (!ids.length || !jours.length) return new Set();
  const { data } = await admin
    .from("taches_validations")
    .select("event_id, jour")
    .in("event_id", ids)
    .in("jour", jours);
  return new Set((data ?? []).map((v) => `${v.event_id}|${v.jour}`));
}

/** Cette tâche tombe-t-elle ce jour-là chez la cliente ? Renvoie l'instant si elle a une heure. */
export function occurrenceDeTache(t: TacheBrute, jour: string, fuseau: string) {
  return occurrenceLe(t, jour, fuseau);
}

/**
 * Les tâches à afficher à la cliente le `jour` donné (AAAA-MM-JJ chez elle) :
 *   • les tâches uniques encore en vie (7 jours après leur création) ;
 *   • les tâches récurrentes dont c'est le jour.
 * Celles qui ont une heure passent en premier, dans l'ordre de l'heure.
 */
export async function tachesDuJour(admin: Admin, userId: string, fuseau: string, jour: string): Promise<TacheDuJour[]> {
  const toutes = await lireTachesBrutes(admin, userId);
  const limite = limiteDeVieTache();

  const retenues = toutes.filter((t) => (estRecurrente(t) ? occurrenceLe(t, jour, fuseau).tombe : t.created_at >= limite));
  const valides = await lireValidations(admin, retenues.filter(estRecurrente).map((t) => t.id), [jour]);

  const liste = retenues.map<TacheDuJour>((t) => {
    const recurrente = estRecurrente(t);
    const occ = occurrenceLe(t, jour, fuseau);
    const instant = occ.instant ?? (t.starts_at ? new Date(t.starts_at) : null);
    const heure = instant
      ? formatHeureDans(instant, fuseau)
      : t.heure ? t.heure.slice(0, 5) : null;
    return {
      id: t.id,
      titre: t.titre,
      message: t.message,
      done: recurrente ? valides.has(`${t.id}|${jour}`) : t.fait_le !== null,
      recurrente,
      rythme: libelleRythme(t.recurrence, t.recurrence_intervalle),
      heure,
      instant,
    };
  });

  // Avec heure d'abord (dans l'ordre), puis les autres ; ordre d'origine sinon.
  return liste
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      if (!!a.t.heure !== !!b.t.heure) return a.t.heure ? -1 : 1;
      if (a.t.heure && b.t.heure && a.t.heure !== b.t.heure) return a.t.heure < b.t.heure ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ t }) => t);
}
