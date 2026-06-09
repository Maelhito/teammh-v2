import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Heure locale d'un instant UTC dans un fuseau donné */
function localTime(utcNow: Date, timezone: string): { hour: number; minute: number; dateStr: string } {
  try {
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(utcNow).map((p) => [p.type, p.value]));
    return {
      hour: parseInt(parts.hour ?? "0"),
      minute: parseInt(parts.minute ?? "0"),
      dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    };
  } catch {
    // Fuseau invalide → fallback UTC
    return {
      hour: utcNow.getUTCHours(),
      minute: utcNow.getUTCMinutes(),
      dateStr: utcNow.toISOString().slice(0, 10),
    };
  }
}

/** Retourne true si l'heure locale tombe dans la fenêtre [targetHour:00, targetHour:59] */
function inHourWindow(hour: number, targetHour: number): boolean {
  return hour === targetHour;
}

/** Calcule le grid_key d'aujourd'hui pour un programme donné */
function todayGridKey(dateDebutStr: string, localDateStr: string): string | null {
  try {
    const start = new Date(dateDebutStr + "T00:00:00");
    const today = new Date(localDateStr + "T00:00:00");
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
    if (diffDays < 0) return null;
    const semaine = Math.floor(diffDays / 7) + 1;
    const jourSemaine = ((today.getDay() + 6) % 7) + 1; // lun=1…dim=7
    return `S${semaine}_J${jourSemaine}`;
  } catch { return null; }
}

/** Tente d'insérer dans notif_log — retourne false si déjà envoyé aujourd'hui */
async function tryMarkSent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  type: string,
  sentDate: string
): Promise<boolean> {
  const { error } = await admin.from("notif_log").insert({ user_id: userId, type, sent_date: sentDate });
  // error.code "23505" = unique violation → déjà envoyé
  return !error;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const utcNow = new Date();
  const logs: string[] = [`[notif-cron] ${utcNow.toISOString()}`];
  let sent = 0;

  const admin = createSupabaseAdminClient();

  // Récupère toutes les subscriptions avec leur timezone
  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("user_id, timezone");

  if (subsError || !subs?.length) {
    logs.push(`[cron] aucune subscription (${subsError?.message ?? "vide"})`);
    return NextResponse.json({ success: true, sent, logs });
  }

  // Déduplique par user_id (une clé peut avoir plusieurs appareils — sendPushToUser gère ça)
  const users = [...new Map(subs.map((s) => [s.user_id, s.timezone ?? "Europe/Paris"])).entries()];
  logs.push(`[cron] ${users.length} utilisateur(s) à vérifier`);

  for (const [userId, timezone] of users) {
    const { hour, minute, dateStr } = localTime(utcNow, timezone);
    const minuteTotal = hour * 60 + minute; // pratique pour comparer des heures relatives

    // ── 1. NOTIFICATIONS DU MATIN (7h local) ──────────────────────────────
    if (inHourWindow(hour, 7)) {
      await sendMorningNotifs(admin, userId, timezone, dateStr, logs, utcNow);
      sent++;
    }

    // ── 2. RAPPEL SÉANCE NON VALIDÉE (19h local) ──────────────────────────
    if (inHourWindow(hour, 19)) {
      const done = await tryMarkSent(admin, userId, "rappel", dateStr);
      if (done) {
        await sendRappelSeance(admin, userId, timezone, dateStr, logs);
        sent++;
      }
    }

    // ── 3. RDV COACH 1H AVANT (si heure précise) ──────────────────────────
    await sendRdvCoachAvant(admin, userId, timezone, dateStr, minuteTotal, logs);

    void sent; // avoid unused warning — sent is counted above
  }

  logs.push(`[cron] terminé — ${sent} action(s)`);
  console.log(logs.join("\n"));
  return NextResponse.json({ success: true, sent, logs });
}

// ─── 1. Notifications du matin ────────────────────────────────────────────────
async function sendMorningNotifs(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  timezone: string,
  dateStr: string,
  logs: string[],
  _utcNow: Date
) {
  // Séance du jour
  const seanceDone = await tryMarkSent(admin, userId, "seance_matin", dateStr);
  if (seanceDone) {
    await checkAndSendSeanceDuJour(admin, userId, timezone, dateStr, logs);
  }

  // Visio de groupe
  const visioDone = await tryMarkSent(admin, userId, "visio_matin", dateStr);
  if (visioDone) {
    await checkAndSendVisioDuJour(admin, userId, dateStr, logs);
  }

  // RDV coach sans heure précise (ou avec heure → géré séparément par sendRdvCoachAvant)
  const rdvDone = await tryMarkSent(admin, userId, "rdv_matin", dateStr);
  if (rdvDone) {
    await checkAndSendRdvDuJour(admin, userId, dateStr, logs);
  }
}

// ─── Séance du jour ───────────────────────────────────────────────────────────
async function checkAndSendSeanceDuJour(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  _timezone: string,
  dateStr: string,
  logs: string[]
) {
  const { data: assignment } = await admin
    .from("client_programmes")
    .select("id, date_debut, grid_data, programme:programmes(nom)")
    .eq("user_id", userId)
    .eq("statut", "en_cours")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment?.date_debut) return;

  const key = todayGridKey(assignment.date_debut, dateStr);
  if (!key) return;

  let grid: Record<string, { type: string; seanceName?: string; nom?: string; duree?: number | null }[]> = {};
  try {
    const src = assignment.grid_data ?? "";
    if (src.startsWith("{")) grid = JSON.parse(src).grid ?? {};
  } catch { return; }

  const items = (grid[key] ?? []).filter((i) => i.type !== "video");
  if (!items.length) return;

  const nomSeance = items[0].seanceName ?? items[0].nom ?? "Séance";
  const duree = items[0].duree;
  const nomProg = (assignment.programme as { nom?: string } | null)?.nom ?? "";

  await sendPushToUser(userId, {
    title: "💪 Séance du jour",
    body: `${nomSeance}${duree ? ` · ${duree} min` : ""}${nomProg ? ` — ${nomProg}` : ""} · C'est parti !`,
    url: `/entrainement`,
  });
  logs.push(`[seance] notif envoyée → ${userId} (${nomSeance})`);
}

// ─── Visio de groupe ──────────────────────────────────────────────────────────
async function checkAndSendVisioDuJour(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  dateStr: string,
  logs: string[]
) {
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, heure")
    .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
    .eq("event_type", "coaching_groupe")
    .eq("date", dateStr)
    .limit(1);

  if (!events?.length) return;

  const ev = events[0];
  const heureStr = ev.heure ? ` à ${(ev.heure as string).slice(0, 5)}` : "";

  await sendPushToUser(userId, {
    title: "🎥 Visio de groupe aujourd'hui",
    body: `${ev.titre ?? "Coaching de groupe"}${heureStr} — retrouve le lien dans l'app`,
    url: `/calendrier`,
  });
  logs.push(`[visio] notif envoyée → ${userId}`);
}

// ─── RDV coach (matin, sans heure précise ou avec heure > 1h) ─────────────────
async function checkAndSendRdvDuJour(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  dateStr: string,
  logs: string[]
) {
  // On envoie ici seulement pour les RDV sans heure (ou avec heure mais on informe le matin quand même)
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, heure")
    .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
    .eq("event_type", "coach")
    .eq("date", dateStr)
    .is("heure", null)     // sans heure → notif matin seulement
    .limit(1);

  if (!events?.length) return;

  const ev = events[0];
  await sendPushToUser(userId, {
    title: "📅 RDV coach aujourd'hui",
    body: `${ev.titre ?? "Rendez-vous avec ton coach"} — prépare-toi !`,
    url: `/calendrier`,
  });
  logs.push(`[rdv] notif matin envoyée → ${userId}`);
}

// ─── 2. Rappel séance non validée ─────────────────────────────────────────────
async function sendRappelSeance(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  _timezone: string,
  dateStr: string,
  logs: string[]
) {
  const { data: assignment } = await admin
    .from("client_programmes")
    .select("id, date_debut, grid_data")
    .eq("user_id", userId)
    .eq("statut", "en_cours")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment?.date_debut) return;

  const key = todayGridKey(assignment.date_debut, dateStr);
  if (!key) return;

  let grid: Record<string, { type: string }[]> = {};
  try {
    const src = assignment.grid_data ?? "";
    if (src.startsWith("{")) grid = JSON.parse(src).grid ?? {};
  } catch { return; }

  const hasSeance = (grid[key] ?? []).some((i) => i.type !== "video");
  if (!hasSeance) return;

  // Vérifier si déjà validée aujourd'hui
  const { data: log } = await admin
    .from("seances_log")
    .select("id")
    .eq("user_id", userId)
    .eq("assignment_id", assignment.id)
    .eq("grid_key", key)
    .limit(1);

  if (log?.length) return; // déjà faite

  await sendPushToUser(userId, {
    title: "🔥 Ta séance t'attend !",
    body: "Tu n'as pas encore fait ta séance du jour — il est encore temps 💪",
    url: `/entrainement`,
  });
  logs.push(`[rappel] notif envoyée → ${userId}`);
}

// ─── 3. RDV coach 1h avant (heure précise) ────────────────────────────────────
async function sendRdvCoachAvant(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  _timezone: string,
  dateStr: string,
  minuteTotal: number,
  logs: string[]
) {
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, titre, heure")
    .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
    .eq("event_type", "coach")
    .eq("date", dateStr)
    .not("heure", "is", null);

  for (const ev of events ?? []) {
    const [hh, mm] = (ev.heure as string).split(":").map(Number);
    const evMinutes = hh * 60 + mm;
    const diffMin = evMinutes - minuteTotal;

    // Fenêtre : 50 à 70 min avant le RDV
    if (diffMin < 50 || diffMin > 70) continue;

    const notifType = `rdv_1h_${ev.id}`;
    const done = await tryMarkSent(admin, userId, notifType, dateStr);
    if (!done) continue;

    await sendPushToUser(userId, {
      title: "📅 RDV coach dans 1h",
      body: `${ev.titre ?? "Rendez-vous avec ton coach"} à ${(ev.heure as string).slice(0, 5)} — prépare-toi !`,
      url: `/calendrier`,
    });
    logs.push(`[rdv-1h] notif envoyée → ${userId} (${ev.heure})`);
  }
}
