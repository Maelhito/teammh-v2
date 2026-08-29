/**
 * LE CRON DES NOTIFICATIONS — passage unique, multi-fuseaux.
 *
 * Avant, trois crons calés sur des heures UTC fixes se partageaient le travail :
 *   • /api/cron/notifications        — jamais déclenché par Vercel (retiré du
 *     vercel.json pour cause de plan Hobby), confié à cron-job.org où il
 *     échouait silencieusement ;
 *   • /api/cron/ttl-notifications    — 0 7 UTC, plus un second passage
 *     `?region=nc` à 0 21 UTC, avec un tri par plage de décalage horaire codée
 *     en dur qui ne couvrait que la Nouvelle-Calédonie. Toute personne dans un
 *     troisième fuseau (Bali, Australie) recevait sa notification « du matin »
 *     en pleine après-midi ;
 *   • /api/cron/unlock-notifications — `if (hourUTC === 21)` en dur, pour une
 *     fonctionnalité désactivée depuis.
 *
 * Désormais : UN seul passage, à lancer au moins toutes les heures. Pour chaque
 * personne, on lit l'heure qu'il est CHEZ ELLE et on n'envoie que ce qui
 * correspond. Plus aucune heure UTC ni aucune région en dur — une cliente qui
 * part en France est traitée comme les autres, sans code à changer.
 *
 * Idempotence : `notif_log` porte une contrainte d'unicité sur
 * (user_id, type, sent_date). Toute insertion en double échoue, donc relancer
 * le cron dix fois dans l'heure n'envoie jamais deux fois la même notification.
 * C'est ce qui rend sûr d'avoir plusieurs déclencheurs en parallèle.
 */

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { decodeAssignments } from "@/lib/programme-planning";
import { formatHeureDans, partiesDans } from "@/lib/temps";
import { getFuseaux } from "@/lib/temps-serveur";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Heure locale à laquelle partent les notifications du matin. */
const HEURE_MATIN = 7;
/** Heure locale du rappel « ta séance t'attend ». */
const HEURE_RAPPEL_SOIR = 19;
/** Au-delà de ce nombre de jours sans activité, on relance la cliente TTL. */
const INACTIVITY_DAYS = 2;

/** Décompose un instant dans le fuseau d'une personne. */
function localTime(utcNow: Date, timezone: string) {
  const p = partiesDans(utcNow, timezone);
  return { hour: p.heure, minute: p.minute, dateStr: p.dateStr, dayOfWeek: p.jourSemaine };
}

/**
 * Calcule le grid_key d'aujourd'hui pour un programme donné.
 * `dureeSemaines` borne la fenêtre : au-delà, le programme est terminé pour
 * cette cliente et ne doit plus déclencher de notification.
 */
function todayGridKey(dateDebutStr: string, localDateStr: string, dureeSemaines?: number): string | null {
  try {
    const start = new Date(dateDebutStr + "T00:00:00");
    const today = new Date(localDateStr + "T00:00:00");
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
    if (diffDays < 0) return null;
    const semaine = Math.floor(diffDays / 7) + 1;
    if (dureeSemaines && semaine > dureeSemaines) return null;
    const jourSemaine = ((today.getDay() + 6) % 7) + 1; // lun=1…dim=7
    return `S${semaine}_J${jourSemaine}`;
  } catch { return null; }
}

/**
 * Réserve l'envoi d'une notification. Renvoie false si elle est déjà partie
 * aujourd'hui — c'est la contrainte d'unicité de notif_log qui tranche, donc
 * deux passages simultanés ne peuvent pas doubler l'envoi.
 */
async function tryMarkSent(admin: Admin, userId: string, type: string, sentDate: string): Promise<boolean> {
  const { error } = await admin.from("notif_log").insert({ user_id: userId, type, sent_date: sentDate });
  return !error; // code 23505 = doublon → déjà envoyé
}

export interface ResultatCron {
  ok: boolean;
  envoyees: number;
  personnes: number;
  logs: string[];
  /** Uniquement en simulation : ce qui partirait, sans rien envoyer. */
  simulation?: { fuseau: string; heureLocale: string; declencherait: string[] }[];
}

export interface OptionsCron {
  /**
   * Simulation : on calcule l'heure locale de chacun et ce qui partirait, sans
   * envoyer une seule notification ni écrire dans notif_log.
   *
   * Sert à répondre à la seule question qui compte pour ce cron — « est-ce que
   * ça tombera au bon moment pour chaque personne, où qu'elle soit ? » — sans
   * avoir à attendre 7h du matin quelque part, ni réveiller une cliente.
   */
  simuler?: boolean;
  /** Instant à simuler (défaut : maintenant). Sans effet hors simulation. */
  instant?: Date;
}

// ─── Passage principal ────────────────────────────────────────────────────────

export async function executerCronNotifications(options: OptionsCron = {}): Promise<ResultatCron> {
  const utcNow = options.simuler && options.instant ? options.instant : new Date();
  const logs: string[] = [`[cron] ${utcNow.toISOString()}`];
  let envoyees = 0;

  const admin = createSupabaseAdminClient();

  // Qui est joignable ? Une personne sans abonnement push ne recevra rien de
  // toute façon, inutile de la faire travailler.
  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("user_id");

  if (subsError || !subs?.length) {
    logs.push(`[cron] aucun abonnement (${subsError?.message ?? "vide"})`);
    return { ok: true, envoyees: 0, personnes: 0, logs };
  }

  // Une personne peut avoir plusieurs appareils : sendPushToUser les gère tous.
  const ids = [...new Set(subs.map((s) => s.user_id as string))];
  const fuseaux = await getFuseaux(ids);

  // Les clientes TTL ont leurs propres relances, en plus de celles de TTM.
  const { data: offres } = await admin
    .from("offres_clientes")
    .select("user_id")
    .eq("offre", "TTL");
  const clientesTtl = new Set((offres ?? []).map((o) => o.user_id as string));

  logs.push(`[cron] ${ids.length} personne(s) — dont ${clientesTtl.size} sur TTL`);

  const simulation: NonNullable<ResultatCron["simulation"]> = [];

  for (const userId of ids) {
    const timezone = fuseaux.get(userId)!;
    const { hour, minute, dateStr, dayOfWeek } = localTime(utcNow, timezone);
    const minuteTotal = hour * 60 + minute;

    if (options.simuler) {
      const declencherait: string[] = [];
      if (hour === HEURE_MATIN) {
        declencherait.push("notifs du matin");
        if (clientesTtl.has(userId)) declencherait.push("relances TTL");
      }
      if (hour === HEURE_RAPPEL_SOIR) declencherait.push("rappel du soir");
      simulation.push({
        fuseau: timezone,
        heureLocale: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        declencherait,
      });
      continue; // rien n'est envoyé, rien n'est écrit
    }

    // ── 1. Le matin, chez elle ────────────────────────────────────────────
    if (hour === HEURE_MATIN) {
      envoyees += await envoyerNotifsDuMatin(admin, userId, timezone, dateStr, logs);

      if (clientesTtl.has(userId)) {
        envoyees += await envoyerNotifsTtl(admin, userId, dateStr, dayOfWeek, utcNow, logs);
      }
    }

    // ── 2. Le soir, chez elle ─────────────────────────────────────────────
    if (hour === HEURE_RAPPEL_SOIR) {
      if (await tryMarkSent(admin, userId, "rappel", dateStr)) {
        envoyees += await sendRappelSeance(admin, userId, timezone, dateStr, logs);
      }
    }

    // ── 3. Une heure avant un rendez-vous ─────────────────────────────────
    // Pas d'heure locale à respecter : la fenêtre se mesure entre deux
    // instants, donc ce test vaut à chaque passage.
    envoyees += await sendRdvCoachAvant(admin, userId, timezone, dateStr, minuteTotal, logs, utcNow);
  }

  if (options.simuler) {
    logs.push(`[cron] SIMULATION à ${utcNow.toISOString()} — rien n'a été envoyé`);
    return { ok: true, envoyees: 0, personnes: ids.length, logs, simulation };
  }

  logs.push(`[cron] terminé — ${envoyees} notification(s)`);
  console.log(logs.join("\n"));
  return { ok: true, envoyees, personnes: ids.length, logs };
}

// ─── 1. Notifications du matin ────────────────────────────────────────────────
async function envoyerNotifsDuMatin(
  admin: Admin,
  userId: string,
  timezone: string,
  dateStr: string,
  logs: string[]
): Promise<number> {
  let n = 0;

  // Séance du jour
  if (await tryMarkSent(admin, userId, "seance_matin", dateStr)) {
    n += await checkAndSendSeanceDuJour(admin, userId, dateStr, logs);
  }

  // Visio de groupe
  if (await tryMarkSent(admin, userId, "visio_matin", dateStr)) {
    n += await checkAndSendVisioDuJour(admin, userId, dateStr, logs, timezone);
  }

  // RDV coach sans heure précise (ceux qui en ont une sont annoncés 1h avant)
  if (await tryMarkSent(admin, userId, "rdv_matin", dateStr)) {
    n += await checkAndSendRdvDuJour(admin, userId, dateStr, logs);
  }

  return n;
}

// ─── Séance du jour ───────────────────────────────────────────────────────────
async function checkAndSendSeanceDuJour(
  admin: Admin,
  userId: string,
  dateStr: string,
  logs: string[]
): Promise<number> {
  // Une cliente peut avoir plusieurs programmes en cours en même temps
  const { data: rows } = await admin
    .from("client_programmes")
    .select("id, date_debut, grid_data, programme:programmes(nom, duree_semaines, description)")
    .eq("user_id", userId)
    .eq("statut", "en_cours")
    .order("date_debut", { ascending: true });

  type SeanceItem = { type: string; seanceName?: string; nom?: string; duree?: number | null };
  const duJour: { nom: string; duree?: number | null; nomProg: string }[] = [];

  for (const assignment of decodeAssignments(rows)) {
    if (!assignment.date_debut) continue;
    const key = todayGridKey(assignment.date_debut, dateStr, assignment.duree_semaines);
    if (!key) continue;

    const items = (assignment.grid[key] ?? []) as SeanceItem[];
    for (const item of items.filter((i) => i.type !== "video")) {
      duJour.push({ nom: item.seanceName ?? item.nom ?? "Séance", duree: item.duree, nomProg: assignment.nom });
    }
  }

  if (!duJour.length) return 0;

  const body =
    duJour.length === 1
      ? `${duJour[0].nom}${duJour[0].duree ? ` · ${duJour[0].duree} min` : ""}${duJour[0].nomProg ? ` — ${duJour[0].nomProg}` : ""} · C'est parti !`
      : `${duJour.length} séances aujourd'hui : ${duJour.map((s) => s.nom).join(", ")} · C'est parti !`;

  await sendPushToUser(userId, {
    title: duJour.length > 1 ? "💪 Séances du jour" : "💪 Séance du jour",
    body,
    url: `/entrainement`,
  });
  logs.push(`[seance] notif envoyée → ${userId} (${duJour.map((s) => s.nom).join(", ")})`);
  return 1;
}

// ─── Visio de groupe ──────────────────────────────────────────────────────────
async function checkAndSendVisioDuJour(
  admin: Admin,
  userId: string,
  dateStr: string,
  logs: string[],
  timezone: string
): Promise<number> {
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, heure, starts_at")
    .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
    .eq("event_type", "coaching_groupe")
    .eq("date", dateStr)
    .limit(1);

  if (!events?.length) return 0;

  const ev = events[0];
  // Une visio de groupe est le cas d'école : une seule ligne en base, un seul
  // instant, mais une heure différente pour chaque cliente selon son pays.
  const heureLue = ev.starts_at
    ? formatHeureDans(ev.starts_at as string, timezone)
    : (ev.heure ? (ev.heure as string).slice(0, 5) : null);
  const heureStr = heureLue ? ` à ${heureLue}` : "";

  await sendPushToUser(userId, {
    title: "🎥 Visio de groupe aujourd'hui",
    body: `${ev.titre ?? "Coaching de groupe"}${heureStr} — retrouve le lien dans l'app`,
    url: `/calendrier`,
  });
  logs.push(`[visio] notif envoyée → ${userId}`);
  return 1;
}

// ─── RDV coach (matin, sans heure précise ou avec heure > 1h) ─────────────────
async function checkAndSendRdvDuJour(
  admin: Admin,
  userId: string,
  dateStr: string,
  logs: string[]
): Promise<number> {
  // On envoie ici seulement pour les RDV sans heure (ou avec heure mais on informe le matin quand même)
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, heure")
    .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
    .eq("event_type", "coach")
    .eq("date", dateStr)
    .is("heure", null)     // sans heure → notif matin seulement
    .limit(1);

  if (!events?.length) return 0;

  const ev = events[0];
  await sendPushToUser(userId, {
    title: "📅 RDV coach aujourd'hui",
    body: `${ev.titre ?? "Rendez-vous avec ton coach"} — prépare-toi !`,
    url: `/calendrier`,
  });
  logs.push(`[rdv] notif matin envoyée → ${userId}`);
  return 1;
}

// ─── 2. Rappel séance non validée ─────────────────────────────────────────────
async function sendRappelSeance(
  admin: Admin,
  userId: string,
  _timezone: string,
  dateStr: string,
  logs: string[]
): Promise<number> {
  const { data: rows } = await admin
    .from("client_programmes")
    .select("id, date_debut, grid_data, programme:programmes(nom, duree_semaines, description)")
    .eq("user_id", userId)
    .eq("statut", "en_cours")
    .order("date_debut", { ascending: true });

  // On rappelle dès qu'AU MOINS une séance du jour n'est pas validée,
  // tous programmes en cours confondus.
  let resteUneSeance = false;

  for (const assignment of decodeAssignments(rows)) {
    if (!assignment.date_debut) continue;
    const key = todayGridKey(assignment.date_debut, dateStr, assignment.duree_semaines);
    if (!key) continue;

    const items = (assignment.grid[key] ?? []) as { type: string }[];
    if (!items.some((i) => i.type !== "video")) continue;

    // Vérifier si déjà validée aujourd'hui
    const { data: log } = await admin
      .from("seances_log")
      .select("id")
      .eq("user_id", userId)
      .eq("assignment_id", assignment.id)
      .eq("grid_key", key)
      .limit(1);

    if (!log?.length) { resteUneSeance = true; break; }
  }

  if (!resteUneSeance) return 0;

  await sendPushToUser(userId, {
    title: "🔥 Ta séance t'attend !",
    body: "Tu n'as pas encore fait ta séance du jour — il est encore temps 💪",
    url: `/entrainement`,
  });
  logs.push(`[rappel] notif envoyée → ${userId}`);
  return 1;
}

// ─── 3. RDV coach 1h avant (heure précise) ────────────────────────────────────
async function sendRdvCoachAvant(
  admin: Admin,
  userId: string,
  timezone: string,
  dateStr: string,
  minuteTotal: number,
  logs: string[],
  utcNow: Date
): Promise<number> {
  let n = 0;
  // On regarde la veille, le jour et le lendemain : « le jour du rendez-vous »
  // n'est pas le même selon le fuseau, et un RDV du 23 à 8h à Nouméa se joue
  // encore le 22 pour quelqu'un à Paris. Filtrer sur la seule date locale en
  // raterait une partie.
  const veille = new Date(utcNow.getTime() - 86400000).toISOString().slice(0, 10);
  const lendemain = new Date(utcNow.getTime() + 86400000).toISOString().slice(0, 10);

  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, heure, starts_at, date")
    .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
    .eq("event_type", "coach")
    .gte("date", veille)
    .lte("date", lendemain)
    .not("heure", "is", null);

  for (const ev of events ?? []) {
    let diffMin: number;

    if (ev.starts_at) {
      // Le cas normal : l'écart se mesure entre deux instants, sans fuseau qui
      // s'en mêle. C'est juste où que soit la cliente, où que soit le coach.
      diffMin = (new Date(ev.starts_at as string).getTime() - utcNow.getTime()) / 60000;
    } else {
      // Ligne héritée jamais migrée : on retombe sur l'ancienne comparaison
      // d'heures murales, valable seulement le jour local de la cliente.
      if (ev.date !== dateStr) continue;
      const [hh, mm] = (ev.heure as string).split(":").map(Number);
      diffMin = hh * 60 + mm - minuteTotal;
    }

    // Fenêtre : 50 à 70 min avant le RDV
    if (diffMin < 50 || diffMin > 70) continue;

    const notifType = `rdv_1h_${ev.id}`;
    const done = await tryMarkSent(admin, userId, notifType, dateStr);
    if (!done) continue;

    // L'heure annoncée est celle que la cliente lit sur son propre calendrier.
    const heureLue = ev.starts_at
      ? formatHeureDans(ev.starts_at as string, timezone)
      : (ev.heure as string).slice(0, 5);

    await sendPushToUser(userId, {
      title: "📅 RDV coach dans 1h",
      body: `${ev.titre ?? "Rendez-vous avec ton coach"} à ${heureLue} — prépare-toi !`,
      url: `/calendrier`,
    });
    logs.push(`[rdv-1h] notif envoyée → ${userId} (${heureLue} chez elle)`);
    n += 1;
  }
  return n;
}

// ─── Relances TTL (Time To Last) ─────────────────────────────────────────────
/**
 * Ces quatre relances partaient auparavant à heure UTC fixe, en pariant que
 * l'horaire choisi tombait « le matin » pour la région visée. C'est pour ça
 * qu'existaient un second cron `?region=nc` et un tri par plage de décalage
 * horaire en dur : un seul horaire UTC ne peut pas être le matin à la fois à
 * Paris et à Nouméa.
 *
 * Elles sont désormais appelées quand il est 7h CHEZ LA CLIENTE, quel que soit
 * son pays. Le tri par région disparaît, et personne ne peut plus être oublié
 * parce qu'il vit dans un troisième fuseau.
 */
async function envoyerNotifsTtl(
  admin: Admin,
  userId: string,
  dateStr: string,
  dayOfWeek: number,
  utcNow: Date,
  logs: string[]
): Promise<number> {
  let n = 0;

  const [{ data: lastVideo }, { data: lastSeance }, { data: profile }, { data: prefs }] = await Promise.all([
    admin.from("ttl_modules_progress").select("watched_at").eq("user_id", userId).order("watched_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("ttl_seances_progress").select("validated_at").eq("user_id", userId).order("validated_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("user_profiles").select("streak_current, streak_last_activity").eq("user_id", userId).maybeSingle(),
    admin.from("ttl_objectifs").select("jours_entrainement").eq("user_id", userId).maybeSingle(),
  ]);

  const timestamps = [lastVideo?.watched_at, lastSeance?.validated_at].filter(Boolean) as string[];
  const lastActivity = timestamps.length ? new Date(Math.max(...timestamps.map((t) => new Date(t).getTime()))) : null;
  const diffDays = lastActivity ? Math.floor((utcNow.getTime() - lastActivity.getTime()) / 86400000) : Infinity;

  // 1. Relance générale si inactivité prolongée
  if (diffDays >= INACTIVITY_DAYS && await tryMarkSent(admin, userId, "ttl_inactivite", dateStr)) {
    await sendPushToUser(userId, {
      title: "🔥 On ne t'a pas vue !",
      body: "Ta séance et tes modules t'attendent sur Time To Last — reviens quand tu veux 💪",
      url: "/ttl",
    });
    logs.push(`[ttl-inactivite] notif envoyée → ${userId} (${diffDays === Infinity ? "jamais active" : `${diffDays}j`})`);
    n += 1;
  }

  // 2. Rappel si aujourd'hui est un des jours d'entraînement qu'elle s'est fixés
  const joursChoisis = (prefs?.jours_entrainement ?? []).map(Number);
  const estJourEntrainement = joursChoisis.includes(dayOfWeek);
  if (estJourEntrainement && await tryMarkSent(admin, userId, "ttl_jour_entrainement", dateStr)) {
    await sendPushToUser(userId, {
      title: "💪 C'est ton jour de séance !",
      body: "Tu t'étais dit que tu t'entraînerais aujourd'hui — on y va ?",
      url: "/ttl/bibliotheque?tab=seances",
    });
    logs.push(`[ttl-jour-entrainement] notif envoyée → ${userId}`);
    n += 1;
  }

  // 3. Maintien de flamme les autres jours — sans doubler le rappel ci-dessus
  if (!estJourEntrainement) {
    const streakCurrent = profile?.streak_current ?? 0;
    if (streakCurrent > 0 && await tryMarkSent(admin, userId, "ttl_flamme_danger", dateStr)) {
      await sendPushToUser(userId, {
        title: "🔥 Garde ta flamme allumée",
        body: `${streakCurrent} jour${streakCurrent > 1 ? "s" : ""} de suite — une capsule de 2 min suffit aujourd'hui`,
        url: "/ttl",
      });
      logs.push(`[ttl-flamme-danger] notif envoyée → ${userId} (série ${streakCurrent})`);
      n += 1;
    }
  }

  // 4. Récap dominical
  if (dayOfWeek === 0 && await tryMarkSent(admin, userId, "ttl_recap_dominical", dateStr)) {
    const weekAgo = new Date(utcNow.getTime() - 7 * 86400000).toISOString();
    const { count: seancesWeek } = await admin
      .from("ttl_seances_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("validated_at", weekAgo);
    const streakCurrent = profile?.streak_current ?? 0;
    const nb = seancesWeek ?? 0;
    await sendPushToUser(userId, {
      title: "📊 Ton récap de la semaine",
      body: nb > 0
        ? `${nb} séance${nb > 1 ? "s" : ""} validée${nb > 1 ? "s" : ""} cette semaine · flamme à ${streakCurrent}j. Bravo !`
        : `Pas de séance cette semaine — nouvelle semaine, nouvelle chance dès demain 💪`,
      url: "/ttl/profil",
    });
    logs.push(`[ttl-recap-dominical] notif envoyée → ${userId} (${nb} séances, série ${streakCurrent})`);
    n += 1;
  }

  return n;
}
