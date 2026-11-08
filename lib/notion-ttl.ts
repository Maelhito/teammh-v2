/**
 * Suivi Time To Live dans Notion : base « Clientes Time To Move ».
 *
 * La fiche de la cliente est retrouvée par son EMAIL (colonne « Email »), puis
 * son statut et ses dates TTL sont mis à jour. Ne lève JAMAIS d'erreur : un
 * souci Notion ne doit en aucun cas gêner le webhook Stripe ni l'accès de la
 * cliente. Sans NOTION_API_KEY, ne fait rien.
 */

const NOTION_VERSION = "2022-06-28";
const BASE_CLIENTES_TTM = "30b6b6b920ae81fe9dbefafe9cb8bc06";

export const STATUT_TTL_EN_COURS = "Time To Live";
export const STATUT_TTL_ARRETE = "Time To Live arrêté";

/** Jour calendaire (AAAA-MM-JJ) à Nouméa, comme le reste de l'app. */
function jourNoumea(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Pacific/Noumea" });
}

async function notion(chemin: string, method: "POST" | "PATCH", body: unknown) {
  const res = await fetch(`https://api.notion.com/v1${chemin}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Notion ${res.status} ${await res.text()}`);
  return res.json();
}

async function trouverFiche(email: string): Promise<string | null> {
  for (const candidat of new Set([email, email.toLowerCase()])) {
    const json = await notion(`/databases/${BASE_CLIENTES_TTM}/query`, "POST", {
      filter: { property: "Email", email: { equals: candidat } },
      page_size: 2,
    });
    if (json.results?.length) return json.results[0].id as string;
  }
  return null;
}

export interface SuiviTtl {
  email: string | null | undefined;
  /** true tant que l'abonnement vit, false une fois réellement arrêté */
  actif: boolean;
  debut: string | null;
  fin: string | null;
}

export async function synchroniserTtlVersNotion(suivi: SuiviTtl): Promise<void> {
  if (!process.env.NOTION_API_KEY || !suivi.email) return;
  try {
    const pageId = await trouverFiche(suivi.email);
    if (!pageId) {
      console.warn("[notion-ttl] aucune fiche Notion avec cet email");
      return;
    }
    const properties: Record<string, unknown> = {
      "Statut Détaillé": { status: { name: suivi.actif ? STATUT_TTL_EN_COURS : STATUT_TTL_ARRETE } },
      "Fin TTL": { date: !suivi.actif && suivi.fin ? { start: jourNoumea(suivi.fin) } : null },
    };
    if (suivi.debut) properties["Début TTL"] = { date: { start: jourNoumea(suivi.debut) } };
    await notion(`/pages/${pageId}`, "PATCH", { properties });
  } catch (err) {
    console.error("[notion-ttl] synchro échouée", err);
  }
}
