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
import { formatHeureDans, partiesDans, aujourdhuiDans } from "@/lib/temps";
import { getFuseaux } from "@/lib/temps-serveur";
import { calculerSerie } from "@/lib/serie";
import type { Offre } from "@/lib/offers/types";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Heure locale à laquelle partent les notifications du matin. */
const HEURE_MATIN = 7;
/** Heure locale du rappel « ta séance t'attend ». */
const HEURE_RAPPEL_SOIR = 19;
/**
 * Les paliers d'inactivité, en jours. Une relance part à chaque palier franchi,
 * et une seule fois par palier.
 *
 * Pourquoi des paliers plutôt qu'un simple seuil : le seuil valait 2 jours et
 * la relance repartait CHAQUE jour tant qu'il était dépassé. Sur TTL, avec une
 * seule utilisatrice, ça ne se voyait pas. Étendu à toutes les clientes, ça
 * revenait à pousser une notification quotidienne à quelqu'un absent depuis
 * trois mois. Six relances au total, puis le silence.
 */
const PALIERS_INACTIVITE = [3, 7, 14, 30, 60, 90];

/**
 * Date figée servant de verrou dans `notif_log`, dont la clé d'unicité est
 * (user_id, type, sent_date). L'utiliser comme date d'envoi rend la
 * notification unique À VIE plutôt qu'unique dans la journée.
 */
const UNE_SEULE_FOIS = "1970-01-01";

/**
 * Mise en service des relances de régularité.
 *
 * Une cliente n'est relancée qu'à partir du moment où elle s'est manifestée
 * APRÈS cette date. Sans cette ligne, le jour du déploiement, 24 clientes
 * étaient déjà absentes depuis 3 à 118 jours : elles auraient toutes reçu leur
 * relance de rattrapage le lendemain matin, plus un récap le dimanche suivant.
 * Personne n'avait rien demandé.
 *
 * Ce n'est pas une exclusion définitive : le jour où l'une d'elles rouvre
 * l'app, valide une séance ou saisit ses mesures, sa dernière trace passe de
 * l'autre côté de la ligne et les relances s'appliquent normalement. Pour une
 * cliente qui vient de s'inscrire et n'a encore rien fait, c'est sa date de
 * démarrage qui fait foi — elle reçoit donc bien son message d'accueil.
 */
const DEBUT_RELANCES = Date.parse("2026-08-30T00:00:00Z");

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

  // Les relances de régularité s'adressent à TOUTES les clientes de l'app,
  // quelle que soit leur offre. Deux exclusions, volontaires :
  //   • un coach ou un admin — sans ce filtre, son absence d'activité de
  //     cliente le ferait relancer comme une cliente inactive ;
  //   • une cliente en pause, terminée, ou dont l'accès a été révoqué — on ne
  //     rappelle pas à quelqu'un d'aller s'entraîner sur une app qu'il ne peut
  //     plus ouvrir.
  const { data: profils } = await admin
    .from("user_profiles")
    .select("user_id, role, statut, acces_app, date_demarrage")
    .in("user_id", ids);

  const relancesPour = new Set(
    (profils ?? [])
      .filter(
        (p) =>
          (p.role ?? "cliente") === "cliente" &&
          (p.statut ?? "active") === "active" &&
          p.acces_app !== false
      )
      .map((p) => p.user_id as string)
  );

  // Sert de point de départ pour une cliente qui n'a encore aucune trace.
  const demarrageParUser = new Map<string, string | null>(
    (profils ?? []).map((p) => [p.user_id as string, (p.date_demarrage as string | null) ?? null])
  );

  // L'offre décide OÙ lire l'activité et vers quelle page renvoyer.
  // Sans ligne d'offre, c'est TTM — comme le fait déjà le middleware.
  const { data: offres } = await admin
    .from("offres_clientes")
    .select("user_id, offre")
    .in("user_id", ids);
  const offreParUser = new Map<string, Offre>(
    (offres ?? []).map((o) => [o.user_id as string, o.offre as Offre])
  );

  logs.push(`[cron] ${ids.length} personne(s) — dont ${relancesPour.size} relançable(s)`);

  const simulation: NonNullable<ResultatCron["simulation"]> = [];

  for (const userId of ids) {
    const timezone = fuseaux.get(userId)!;
    const { hour, minute, dateStr, dayOfWeek } = localTime(utcNow, timezone);
    const minuteTotal = hour * 60 + minute;

    if (options.simuler) {
      const declencherait: string[] = [];
      if (hour === HEURE_MATIN) {
        declencherait.push("notifs du matin");
        if (relancesPour.has(userId)) {
          declencherait.push(`relances ${offreParUser.get(userId) ?? "TTM"}`);
        }
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

      if (relancesPour.has(userId)) {
        envoyees += await envoyerRelances(
          admin, userId, offreParUser.get(userId) ?? "TTM",
          demarrageParUser.get(userId) ?? null,
          timezone, dateStr, dayOfWeek, utcNow, logs
        );
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
// ─── Relances de régularité — toutes les clientes, TTM comme TTL ─────────────
/**
 * Quatre relances de motivation, envoyées quand il est 7h CHEZ LA CLIENTE.
 * Elles partaient auparavant à heure UTC fixe, en pariant que l'horaire choisi
 * tombait « le matin » pour la région visée : d'où un second cron `?region=nc`
 * et un tri par plage de décalage horaire en dur. Un seul horaire UTC ne peut
 * pas être le matin à la fois à Paris et à Nouméa.
 *
 * Elles ne visaient que TTL ; elles s'adressent maintenant à toutes les
 * clientes de l'app. Mais l'activité ne se lit PAS au même endroit selon
 * l'offre :
 *   • TTL — modules et séances de son parcours (`ttl_*`), série stockée sur
 *     `user_profiles` ;
 *   • TTM — journal des séances (`seances_log`), et série RECALCULÉE depuis la
 *     grille du programme par `lib/serie.ts`, TTM ne tenant aucun compteur.
 *
 * Lire les tables TTL pour une cliente TTM la ferait passer pour éternellement
 * inactive et lui annoncerait « 0 séance » tous les dimanches.
 */

/** Ce que les quatre relances ont besoin de savoir, quelle que soit l'offre. */
interface ActiviteCliente {
  /** dernière trace d'activité, tous supports confondus */
  derniereActivite: Date | null;
  /** série en cours, dans le sens propre à l'offre */
  serie: number;
  /** séances validées sur les sept derniers jours */
  seancesDerniereSemaine: number;
  /** jours d'entraînement que la cliente s'est fixés (0 = dimanche) */
  joursChoisis: number[];
  accueil: string;
  seances: string;
  profil: string;
}

async function lireActiviteTtl(admin: Admin, userId: string, utcNow: Date): Promise<ActiviteCliente> {
  const semaineAvant = new Date(utcNow.getTime() - 7 * 86400000).toISOString();

  const [{ data: lastVideo }, { data: lastSeance }, { data: profile }, { data: prefs }, { count: seancesWeek }] =
    await Promise.all([
      admin.from("ttl_modules_progress").select("watched_at").eq("user_id", userId).order("watched_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("ttl_seances_progress").select("validated_at").eq("user_id", userId).order("validated_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("user_profiles").select("streak_current").eq("user_id", userId).maybeSingle(),
      admin.from("ttl_objectifs").select("jours_entrainement").eq("user_id", userId).maybeSingle(),
      admin.from("ttl_seances_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("validated_at", semaineAvant),
    ]);

  const marqueurs = [lastVideo?.watched_at, lastSeance?.validated_at].filter(Boolean) as string[];

  return {
    derniereActivite: marqueurs.length
      ? new Date(Math.max(...marqueurs.map((t) => new Date(t).getTime())))
      : null,
    serie: profile?.streak_current ?? 0,
    seancesDerniereSemaine: seancesWeek ?? 0,
    joursChoisis: (prefs?.jours_entrainement ?? []).map(Number),
    accueil: "/ttl",
    seances: "/ttl/sport",
    profil: "/ttl/profil",
  };
}

/**
 * Dernière trace d'une cliente TTM dans l'app.
 *
 * Surtout pas les seules séances validées : beaucoup de clientes suivent leur
 * programme sans jamais appuyer sur « séance terminée ». Sur les 27 clientes de
 * l'app au moment d'écrire ces lignes, 24 n'avaient aucune séance validée et
 * étaient pourtant actives ailleurs — mesures, modules, photos. Les relancer
 * comme inactives aurait été faux pour presque toutes.
 */
async function derniereTraceTtm(admin: Admin, userId: string): Promise<Date | null> {
  const sources: [string, string][] = [
    ["seances_log", "created_at"],
    ["module_completions", "completed_at"],
    ["mesures", "created_at"],
    ["photos_progression", "created_at"],
  ];

  const dates = await Promise.all(
    sources.map(async ([table, colonne]) => {
      const { data } = await admin
        .from(table)
        .select(colonne)
        .eq("user_id", userId)
        .order(colonne, { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as Record<string, string> | null)?.[colonne] ?? null;
    })
  );

  const instants = dates.filter(Boolean).map((d) => new Date(d as string).getTime());
  return instants.length ? new Date(Math.max(...instants)) : null;
}

async function lireActiviteTtm(
  admin: Admin,
  userId: string,
  timezone: string,
  utcNow: Date
): Promise<ActiviteCliente> {
  const semaineAvant = new Date(utcNow.getTime() - 7 * 86400000).toISOString();

  const [{ data: journal }, { data: assignations }, derniereTrace] = await Promise.all([
    admin
      .from("seances_log")
      .select("id, grid_key, assignment_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Tout l'historique, programmes terminés compris : une série ne s'efface
    // pas parce qu'un programme s'achève. Les programmes en pause sont écartés,
    // ils ne doivent ni créditer ni pénaliser.
    admin
      .from("client_programmes")
      .select("*, programme:programmes(nom, duree_semaines, description)")
      .eq("user_id", userId)
      .in("statut", ["en_cours", "termine"])
      .order("date_debut", { ascending: true }),
    derniereTraceTtm(admin, userId),
  ]);

  const lignes = journal ?? [];

  // Refaire une séance ré-enregistre une ligne : on compte les séances
  // distinctes, pas les lignes, exactement comme le tableau de bord.
  const distinctes = new Set(
    lignes
      .filter((l) => (l.created_at as string) >= semaineAvant && l.grid_key)
      .map((l) => `${l.assignment_id}:${l.grid_key}`)
  );

  return {
    derniereActivite: derniereTrace,
    serie: calculerSerie(decodeAssignments(assignations), lignes, aujourdhuiDans(timezone)).serie,
    seancesDerniereSemaine: distinctes.size,
    // Une cliente TTM ne choisit pas ses jours : son calendrier est posé par le
    // coach, et la notification « ta séance du jour » part déjà le matin.
    // Ajouter un second rappel ici ferait doublon.
    joursChoisis: [],
    accueil: "/dashboard",
    seances: "/entrainement",
    profil: "/profil",
  };
}

async function envoyerRelances(
  admin: Admin,
  userId: string,
  offre: Offre,
  dateDemarrage: string | null,
  timezone: string,
  dateStr: string,
  dayOfWeek: number,
  utcNow: Date,
  logs: string[]
): Promise<number> {
  let n = 0;

  const a = offre === "TTL"
    ? await lireActiviteTtl(admin, userId, utcNow)
    : await lireActiviteTtm(admin, userId, timezone, utcNow);

  // Le point de départ de son absence : sa dernière trace, ou à défaut le jour
  // où son accompagnement a démarré. Antérieur à la mise en service = on ne
  // relance pas (voir DEBUT_RELANCES).
  const debutAbsence = a.derniereActivite
    ?? (dateDemarrage ? new Date(dateDemarrage + "T00:00:00Z") : null);

  if (!debutAbsence || debutAbsence.getTime() < DEBUT_RELANCES) {
    return 0;
  }

  // 1. Relance d'inactivité, au palier le plus haut déjà franchi. Comparer avec
  // `>=` plutôt qu'avec une égalité stricte : un passage de cron manqué ne doit
  // pas faire sauter le palier pour toujours.
  const diffDays = Math.floor((utcNow.getTime() - debutAbsence.getTime()) / 86400000);
  const palier = [...PALIERS_INACTIVITE].reverse().find((seuil) => diffDays >= seuil);

  if (palier && a.derniereActivite === null) {
    // Jamais aucune trace : ce n'est pas une revenante en retard, c'est
    // quelqu'un qui n'a pas encore commencé. Message d'accueil, pas de
    // reproche — et une seule fois, jamais répété.
    if (await tryMarkSent(admin, userId, "relance_premier_pas", UNE_SEULE_FOIS)) {
      await sendPushToUser(userId, {
        title: "🚀 Ta première séance t'attend",
        body: "Tout est prêt de ton côté — on commence quand tu veux 💪",
        url: a.accueil,
      });
      logs.push(`[relance-premier-pas] notif envoyée → ${userId} (${offre}, ${diffDays}j après son démarrage)`);
      n += 1;
    }
  } else if (palier && a.derniereActivite) {
    // La clé d'unicité porte le JOUR DE SA DERNIÈRE ACTIVITÉ : chaque période
    // d'absence a la sienne. Une cliente qui revient puis décroche à nouveau
    // sera donc relancée à nouveau, sans que les paliers déjà franchis
    // rejouent pour autant.
    const cleAbsence = a.derniereActivite.toISOString().slice(0, 10);

    if (await tryMarkSent(admin, userId, `relance_inactivite_${palier}`, cleAbsence)) {
      await sendPushToUser(userId, {
        title: "🔥 On ne t'a pas vue !",
        body: "Ta séance t'attend — reviens quand tu veux 💪",
        url: a.accueil,
      });
      logs.push(`[relance-inactivite] notif envoyée → ${userId} (${offre}, ${diffDays}j, palier ${palier})`);
      n += 1;
    }
  }

  // 2. Rappel si aujourd'hui est un des jours d'entraînement qu'elle s'est fixés
  const estJourEntrainement = a.joursChoisis.includes(dayOfWeek);
  if (estJourEntrainement && await tryMarkSent(admin, userId, "relance_jour_entrainement", dateStr)) {
    await sendPushToUser(userId, {
      title: "💪 C'est ton jour de séance !",
      body: "Tu t'étais dit que tu t'entraînerais aujourd'hui — on y va ?",
      url: a.seances,
    });
    logs.push(`[relance-jour-entrainement] notif envoyée → ${userId} (${offre})`);
    n += 1;
  }

  // 3. Maintien de flamme les autres jours — sans doubler le rappel ci-dessus
  if (!estJourEntrainement && a.serie > 0) {
    if (await tryMarkSent(admin, userId, "relance_flamme_danger", dateStr)) {
      await sendPushToUser(userId, {
        title: "🔥 Garde ta flamme allumée",
        body: `${a.serie} séance${a.serie > 1 ? "s" : ""} d'affilée — ne casse pas la série aujourd'hui`,
        url: a.accueil,
      });
      logs.push(`[relance-flamme-danger] notif envoyée → ${userId} (${offre}, série ${a.serie})`);
      n += 1;
    }
  }

  // 4. Récap dominical
  if (dayOfWeek === 0 && await tryMarkSent(admin, userId, "relance_recap_dominical", dateStr)) {
    const nb = a.seancesDerniereSemaine;
    await sendPushToUser(userId, {
      title: "📊 Ton récap de la semaine",
      body: nb > 0
        ? `${nb} séance${nb > 1 ? "s" : ""} validée${nb > 1 ? "s" : ""} cette semaine · série à ${a.serie}. Bravo !`
        : `Pas de séance cette semaine — nouvelle semaine, nouvelle chance dès demain 💪`,
      url: a.profil,
    });
    logs.push(`[relance-recap-dominical] notif envoyée → ${userId} (${offre}, ${nb} séances, série ${a.serie})`);
    n += 1;
  }

  return n;
}
