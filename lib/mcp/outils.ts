/**
 * Connecteur Claude (MCP) — les outils que Claude peut appeler.
 *
 * LECTURE SEULE : aucun outil n'écrit, ne modifie ni ne supprime quoi que ce
 * soit. Chaque outil ne voit que les clientes du compte connecté
 * (voir lib/mcp/acces.ts).
 *
 * Les chiffres suivent les mêmes règles que l'app :
 *  - une séance faite = une ligne de `seances_log` (bouton « Terminer ») ;
 *  - les écarts de mesures = `ecarts()` de lib/mesures.ts, comme la fiche coach ;
 *  - les dates sont données dans le fuseau de la cliente.
 */
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { CHAMPS, ecarts, trierParDate, type Mesure } from "@/lib/mesures";
import { fuseauOuDefaut, partiesDans } from "@/lib/temps";
import { clientesVisibles, type ClienteVisible } from "./acces";

type Args = Record<string, unknown>;

export interface Outil {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
  executer: (user: User, args: Args) => Promise<unknown>;
}

const LECTURE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const CHAMP_CLIENTE = {
  type: "string",
  description: "La cliente : son prénom, son prénom + nom, son email ou son identifiant.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Outils de base
// ─────────────────────────────────────────────────────────────────────────────

/** Les requêtes Supabase plafonnent à 1000 lignes : on lit par pages. */
async function toutesLesLignes<T>(
  page: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const lignes: T[] = [];
  for (let de = 0; de < 100_000; de += 1000) {
    const { data, error } = await page(de, de + 999);
    if (error) throw new Error(error.message);
    lignes.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return lignes;
}

function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function nomComplet(c: ClienteVisible): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ").trim() || c.email;
}

function identite(c: ClienteVisible) {
  return { id: c.id, prenom: c.prenom?.trim() || null, nom: c.nom?.trim() || null, email: c.email };
}

class ErreurOutil extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
  }
}

/** Retrouve UNE cliente à partir d'un prénom, d'un nom, d'un email ou d'un id. */
function trouverCliente(visibles: ClienteVisible[], recherche: unknown): ClienteVisible {
  const texte = typeof recherche === "string" ? recherche.trim() : "";
  if (!texte) throw new ErreurOutil("Précise la cliente (prénom, nom ou email).");

  const parId = visibles.find((c) => c.id === texte);
  if (parId) return parId;

  const q = sansAccents(texte);
  const parEmail = visibles.find((c) => sansAccents(c.email) === q);
  if (parEmail) return parEmail;

  const exacts = visibles.filter((c) => sansAccents(nomComplet(c)) === q || sansAccents(c.prenom ?? "") === q);
  if (exacts.length === 1) return exacts[0];

  const proches = exacts.length
    ? exacts
    : visibles.filter((c) => {
        const tout = sansAccents(`${c.prenom ?? ""} ${c.nom ?? ""} ${c.email}`);
        return q.split(/\s+/).every((mot) => tout.includes(mot));
      });
  if (proches.length === 1) return proches[0];

  if (!proches.length) {
    throw new ErreurOutil(`Aucune cliente ne correspond à « ${texte} » parmi celles que tu suis.`);
  }
  throw new ErreurOutil(
    `Plusieurs clientes correspondent à « ${texte} ». Redemande avec l'email ou l'identifiant de la bonne.`,
    { clientes: proches.map(identite) },
  );
}

interface LigneSeance {
  id: string;
  user_id: string;
  assignment_id: string | null;
  grid_key: string | null;
  seance_nom: string | null;
  completed_at: string | null;
  created_at: string;
  duration_min: number | null;
  note_etoiles: number | null;
  note_texte: string | null;
}

function instantSeance(s: { completed_at: string | null; created_at: string }): Date {
  return new Date(s.completed_at ?? s.created_at);
}

function dateLocale(instant: Date, fuseau: string | null): string {
  return partiesDans(instant, fuseauOuDefaut(fuseau)).dateStr;
}

function heureLocale(instant: Date, fuseau: string | null): string {
  const p = partiesDans(instant, fuseauOuDefaut(fuseau));
  return `${String(p.heure).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

async function seancesDe(ids: string[]): Promise<LigneSeance[]> {
  if (!ids.length) return [];
  const admin = createSupabaseAdminClient();
  const lignes: LigneSeance[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100);
    lignes.push(
      ...(await toutesLesLignes<LigneSeance>((de, a) =>
        admin
          .from("seances_log")
          .select("id, user_id, assignment_id, grid_key, seance_nom, completed_at, created_at, duration_min, note_etoiles, note_texte")
          .in("user_id", lot)
          .order("created_at", { ascending: true })
          .range(de, a),
      )),
    );
  }
  return lignes;
}

interface LigneTtl {
  user_id: string;
  video_id: string;
  semaine: number;
  periode: string | null;
  validated_at: string | null;
}

async function seancesTtlDe(ids: string[]): Promise<LigneTtl[]> {
  if (!ids.length) return [];
  const admin = createSupabaseAdminClient();
  const lignes: LigneTtl[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100);
    lignes.push(
      ...(await toutesLesLignes<LigneTtl>((de, a) =>
        admin
          .from("ttl_seances_progress")
          .select("user_id, video_id, semaine, periode, validated_at")
          .in("user_id", lot)
          .order("validated_at", { ascending: true })
          .range(de, a),
      )),
    );
  }
  return lignes;
}

async function offresDe(ids: string[]) {
  const map = new Map<string, { offre: string; phase: string | null; date_debut: string | null }>();
  if (!ids.length) return map;
  const admin = createSupabaseAdminClient();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from("offres_clientes")
      .select("user_id, offre, phase, date_debut")
      .in("user_id", ids.slice(i, i + 200));
    for (const o of data ?? []) map.set(o.user_id, { offre: o.offre ?? "TTM", phase: o.phase ?? null, date_debut: o.date_debut ?? null });
  }
  return map;
}

function moyenne(valeurs: number[]): number | null {
  if (!valeurs.length) return null;
  return Math.round((valeurs.reduce((s, v) => s + v, 0) / valeurs.length) * 10) / 10;
}

function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

function dateValide(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Les outils
// ─────────────────────────────────────────────────────────────────────────────

const listerClientes: Outil = {
  name: "lister_clientes",
  title: "Lister les clientes",
  description:
    "Liste les clientes que tu suis dans l'app Time To Move, avec leur offre (TTM ou TTL), leur statut, le nombre de séances faites et la date de la dernière. " +
    "Utilise-le pour retrouver une cliente, comparer les clientes ou repérer celles qui ne s'entraînent plus.",
  inputSchema: {
    type: "object",
    properties: {
      recherche: { type: "string", description: "Facultatif : un prénom, un nom ou un email pour filtrer." },
      statut: {
        type: "string",
        enum: ["active", "pause", "terminee", "toutes"],
        description: "Facultatif : ne garder qu'un statut. Par défaut, toutes.",
      },
    },
    additionalProperties: false,
  },
  annotations: { title: "Lister les clientes", ...LECTURE },
  async executer(user, args) {
    let visibles = await clientesVisibles(user);

    const recherche = typeof args.recherche === "string" ? sansAccents(args.recherche) : "";
    if (recherche) {
      visibles = visibles.filter((c) => {
        const tout = sansAccents(`${c.prenom ?? ""} ${c.nom ?? ""} ${c.email}`);
        return recherche.split(/\s+/).every((mot) => tout.includes(mot));
      });
    }
    const statut = typeof args.statut === "string" ? args.statut : "toutes";
    if (statut !== "toutes") visibles = visibles.filter((c) => c.statut === statut);

    const ids = visibles.map((c) => c.id);
    const [seances, ttl, offres] = await Promise.all([seancesDe(ids), seancesTtlDe(ids), offresDe(ids)]);

    const clientes = visibles.map((c) => {
      const siennes = seances.filter((s) => s.user_id === c.id);
      const derniere = siennes.length ? instantSeance(siennes[siennes.length - 1]) : null;
      const ttlSiennes = ttl.filter((s) => s.user_id === c.id);
      return {
        ...identite(c),
        offre: offres.get(c.id)?.offre ?? "TTM",
        statut: c.statut,
        date_demarrage: c.date_demarrage,
        seances_faites: siennes.length,
        derniere_seance: derniere ? dateLocale(derniere, c.timezone) : null,
        ...(ttlSiennes.length ? { seances_ttl_validees: ttlSiennes.length } : {}),
      };
    });
    clientes.sort((a, b) => `${a.prenom ?? ""} ${a.nom ?? ""}`.localeCompare(`${b.prenom ?? ""} ${b.nom ?? ""}`, "fr"));

    return { nombre: clientes.length, clientes };
  },
};

const ficheCliente: Outil = {
  name: "fiche_cliente",
  title: "Fiche d'une cliente",
  description:
    "Le bilan complet d'une cliente : identité, offre, coach, objectifs, programmes, séances (total, régularité par mois, durée et ressenti moyens) " +
    "et évolution des mesures (poids, tours) depuis le départ. Idéal pour une fiche de suivi ou de fin d'accompagnement.",
  inputSchema: {
    type: "object",
    properties: { cliente: CHAMP_CLIENTE },
    required: ["cliente"],
    additionalProperties: false,
  },
  annotations: { title: "Fiche d'une cliente", ...LECTURE },
  async executer(user, args) {
    const c = trouverCliente(await clientesVisibles(user), args.cliente);
    const admin = createSupabaseAdminClient();

    const equipeIds = [c.coach_id, c.nutrition_id].filter((x): x is string => !!x);
    const [seances, ttl, offres, programmesRes, mesuresRes, equipeRes] = await Promise.all([
      seancesDe([c.id]),
      seancesTtlDe([c.id]),
      offresDe([c.id]),
      admin
        .from("client_programmes")
        .select("id, statut, date_debut, seances_effectuees, created_at, programme:programmes(nom, duree_semaines)")
        .eq("user_id", c.id)
        .order("created_at", { ascending: true }),
      admin
        .from("mesures")
        .select("id, date, poids, tour_taille, tour_hanches, tour_poitrine, note")
        .eq("user_id", c.id)
        .order("date", { ascending: true }),
      equipeIds.length
        ? admin.from("team_members").select("id, nom").in("id", equipeIds)
        : Promise.resolve({ data: [] as { id: string; nom: string | null }[] }),
    ]);

    const nomEquipe = (id: string | null) => (id ? (equipeRes.data ?? []).find((m) => m.id === id)?.nom ?? null : null);

    // Séances
    const dates = seances.map((s) => dateLocale(instantSeance(s), c.timezone));
    const parMois: Record<string, number> = {};
    for (const d of dates) parMois[d.slice(0, 7)] = (parMois[d.slice(0, 7)] ?? 0) + 1;
    const premiere = dates[0] ?? null;
    const derniere = dates[dates.length - 1] ?? null;
    const semaines = premiere && derniere ? Math.max(1, (joursEntre(premiere, derniere) + 1) / 7) : null;
    const distinctes = new Set(seances.map((s) => (s.assignment_id && s.grid_key ? `${s.assignment_id}|${s.grid_key}` : s.id))).size;

    // Mesures
    const mesures = (mesuresRes.data ?? []) as Mesure[];
    const triees = trierParDate(mesures);
    const evolution = Object.fromEntries(
      CHAMPS.map(({ champ, label, unite }) => {
        const avec = triees.filter((m) => m[champ] != null);
        const e = ecarts(mesures, champ);
        return [
          champ,
          {
            label,
            unite,
            depart: avec.length ? Number(avec[0][champ]) : null,
            date_depart: avec[0]?.date ?? null,
            actuel: e.actuel,
            date_actuel: avec[avec.length - 1]?.date ?? null,
            ecart_depuis_le_depart: e.vsDepart,
            ecart_depuis_la_precedente: e.vsPrecedent,
          },
        ];
      }),
    );

    const offre = offres.get(c.id);
    return {
      cliente: { ...identite(c), statut: c.statut, inscrite_le: c.inscrite_le, date_demarrage: c.date_demarrage, fuseau: fuseauOuDefaut(c.timezone) },
      offre: offre ?? { offre: "TTM", phase: null, date_debut: null },
      coach: nomEquipe(c.coach_id),
      nutrition: nomEquipe(c.nutrition_id),
      objectifs: {
        poids_4_mois: c.objectif_4mois_poids,
        bien_etre_4_mois: c.objectif_4mois_bienetre,
        poids_12_mois: c.objectif_12mois_poids,
        bien_etre_12_mois: c.objectif_12mois_bienetre,
      },
      seances: {
        faites: seances.length,
        seances_differentes: distinctes,
        premiere,
        derniere,
        moyenne_par_semaine: semaines ? Math.round((seances.length / semaines) * 10) / 10 : null,
        par_mois: parMois,
        duree_moyenne_min: moyenne(seances.map((s) => s.duration_min).filter((v): v is number => typeof v === "number")),
        note_moyenne_sur_5: moyenne(seances.map((s) => s.note_etoiles).filter((v): v is number => typeof v === "number")),
        ...(ttl.length ? { seances_ttl_validees: ttl.length } : {}),
      },
      programmes: (programmesRes.data ?? []).map((p) => {
        const prog = (Array.isArray(p.programme) ? p.programme[0] : p.programme) as { nom?: string; duree_semaines?: number } | null;
        return {
          nom: prog?.nom ?? null,
          duree_semaines: prog?.duree_semaines ?? null,
          statut: p.statut,
          date_debut: p.date_debut,
          seances_validees: p.seances_effectuees ?? 0,
        };
      }),
      mesures: {
        nombre_de_prises: triees.length,
        premiere: triees[0]?.date ?? null,
        derniere: triees[triees.length - 1]?.date ?? null,
        evolution,
        note: "Pour tracer les courbes, utilise l'outil mesures_cliente (toutes les prises, date par date).",
      },
    };
  },
};

const seancesCliente: Outil = {
  name: "seances_cliente",
  title: "Séances d'une cliente",
  description:
    "Toutes les séances faites par une cliente, une par ligne : date et heure (dans son fuseau), nom de la séance, programme, durée, note sur 5 et commentaire. " +
    "Utilise-le pour un calendrier d'assiduité, une courbe de régularité ou relire ses ressentis.",
  inputSchema: {
    type: "object",
    properties: {
      cliente: CHAMP_CLIENTE,
      depuis: { type: "string", description: "Facultatif : date de début incluse, au format AAAA-MM-JJ." },
      jusqua: { type: "string", description: "Facultatif : date de fin incluse, au format AAAA-MM-JJ." },
    },
    required: ["cliente"],
    additionalProperties: false,
  },
  annotations: { title: "Séances d'une cliente", ...LECTURE },
  async executer(user, args) {
    const c = trouverCliente(await clientesVisibles(user), args.cliente);
    const admin = createSupabaseAdminClient();
    const depuis = dateValide(args.depuis);
    const jusqua = dateValide(args.jusqua);

    const [seances, ttl, programmesRes] = await Promise.all([
      seancesDe([c.id]),
      seancesTtlDe([c.id]),
      admin.from("client_programmes").select("id, programme:programmes(nom)").eq("user_id", c.id),
    ]);
    const nomProgramme = new Map(
      (programmesRes.data ?? []).map((p) => {
        const prog = (Array.isArray(p.programme) ? p.programme[0] : p.programme) as { nom?: string } | null;
        return [p.id as string, prog?.nom ?? null];
      }),
    );

    const dansPeriode = (d: string) => (!depuis || d >= depuis) && (!jusqua || d <= jusqua);

    const lignes = seances
      .map((s) => {
        const instant = instantSeance(s);
        return {
          date: dateLocale(instant, c.timezone),
          heure: heureLocale(instant, c.timezone),
          seance: s.seance_nom,
          programme: s.assignment_id ? nomProgramme.get(s.assignment_id) ?? null : null,
          duree_min: s.duration_min,
          note_sur_5: s.note_etoiles,
          commentaire: s.note_texte,
        };
      })
      .filter((s) => dansPeriode(s.date));

    const lignesTtl = ttl
      .filter((s) => s.validated_at)
      .map((s) => ({ date: dateLocale(new Date(s.validated_at!), c.timezone), video: s.video_id, semaine: s.semaine, periode: s.periode }))
      .filter((s) => dansPeriode(s.date));

    return {
      cliente: identite(c),
      fuseau: fuseauOuDefaut(c.timezone),
      periode: { depuis, jusqua },
      nombre: lignes.length,
      seances: lignes,
      ...(lignesTtl.length ? { seances_ttl: { nombre: lignesTtl.length, validees: lignesTtl } } : {}),
    };
  },
};

const mesuresCliente: Outil = {
  name: "mesures_cliente",
  title: "Mesures d'une cliente",
  description:
    "Toutes les prises de mesures d'une cliente, date par date : poids (kg), tour de taille, de hanches et de poitrine (cm), avec sa note. " +
    "Donne aussi les écarts depuis le départ, calculés comme dans l'app. C'est l'outil à utiliser pour dessiner ses courbes d'évolution.",
  inputSchema: {
    type: "object",
    properties: { cliente: CHAMP_CLIENTE },
    required: ["cliente"],
    additionalProperties: false,
  },
  annotations: { title: "Mesures d'une cliente", ...LECTURE },
  async executer(user, args) {
    const c = trouverCliente(await clientesVisibles(user), args.cliente);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("mesures")
      .select("id, date, poids, tour_taille, tour_hanches, tour_poitrine, note")
      .eq("user_id", c.id)
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);

    const mesures = (data ?? []) as Mesure[];
    const triees = trierParDate(mesures);
    return {
      cliente: identite(c),
      unites: Object.fromEntries(CHAMPS.map(({ champ, label, unite }) => [champ, `${label} (${unite})`])),
      nombre_de_prises: triees.length,
      prises: triees.map((m) => ({
        date: m.date,
        poids: m.poids,
        tour_taille: m.tour_taille,
        tour_hanches: m.tour_hanches,
        tour_poitrine: m.tour_poitrine,
        note: m.note,
      })),
      ecarts_depuis_le_depart: Object.fromEntries(CHAMPS.map(({ champ }) => [champ, ecarts(mesures, champ).vsDepart])),
      objectifs: { poids_4_mois: c.objectif_4mois_poids, poids_12_mois: c.objectif_12mois_poids },
    };
  },
};

export const OUTILS: Outil[] = [listerClientes, ficheCliente, seancesCliente, mesuresCliente];

export const INSTRUCTIONS = `Connecteur de l'app Time To Move (TTM) de la Team MJ, en lecture seule.
Il donne accès aux clientes que suit la personne connectée : séances faites, programmes, mesures (poids et tours) et objectifs.
- Commence par lister_clientes ou fiche_cliente. Si plusieurs clientes portent le même prénom, demande laquelle.
- Une « séance faite » = une séance validée avec le bouton « Terminer » dans l'app.
- Pour des courbes, utilise mesures_cliente (poids et tours) et seances_cliente (régularité), puis dessine les graphiques toi-même.
- Les dates sont dans le fuseau de la cliente. Réponds en français, simplement, sans jargon technique.
- Ces données sont personnelles et de santé : ne les utilise que pour le suivi des clientes.`;

/** Exécute un outil et met en forme la réponse MCP. */
export async function appelerOutil(user: User, nom: string, args: Args) {
  const outil = OUTILS.find((o) => o.name === nom);
  if (!outil) return { content: [{ type: "text", text: `Outil inconnu : ${nom}` }], isError: true };
  try {
    const resultat = await outil.executer(user, args ?? {});
    return { content: [{ type: "text", text: JSON.stringify(resultat, null, 2) }] };
  } catch (e) {
    if (e instanceof ErreurOutil) {
      const texte = e.details ? `${e.message}\n${JSON.stringify(e.details, null, 2)}` : e.message;
      return { content: [{ type: "text", text: texte }], isError: true };
    }
    console.error("[mcp] outil", nom, e);
    return { content: [{ type: "text", text: "Erreur en lisant les données de l'app. Réessaie dans un instant." }], isError: true };
  }
}
