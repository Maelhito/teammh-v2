import { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Fichiers de la partie Alimentation TTL dans le stockage Supabase.
 * Serveur uniquement (clé de service).
 */

const BUCKETS = ["ttl-images", "ttl-docs"] as const;
type Bucket = (typeof BUCKETS)[number];

/** Les fichiers de l'Alimentation sont nommés « <horodatage>-plan-… » ou « <horodatage>-recette-… ». */
const NOM_ALIMENTATION = /^\d+-(plan|recette)-/;

/** « https://…/storage/v1/object/public/ttl-images/123-plan.jpg » → { bucket, chemin } */
export function fichierDepuisUrl(url: string | null | undefined): { bucket: Bucket; chemin: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m || !(BUCKETS as readonly string[]).includes(m[1])) return null;
  return { bucket: m[1] as Bucket, chemin: decodeURIComponent(m[2]) };
}

/** Supprime du stockage les fichiers désignés par leurs URLs publiques. */
export async function supprimerFichiers(urls: (string | null | undefined)[]) {
  const parBucket = new Map<Bucket, string[]>();
  for (const url of urls) {
    const f = fichierDepuisUrl(url);
    if (!f) continue;
    parBucket.set(f.bucket, [...(parBucket.get(f.bucket) ?? []), f.chemin]);
  }
  const admin = createSupabaseAdminClient();
  for (const [bucket, chemins] of parBucket) {
    for (let i = 0; i < chemins.length; i += 500) {
      await admin.storage.from(bucket).remove(chemins.slice(i, i + 500));
    }
  }
}

interface FichierOrphelin {
  bucket: Bucket;
  chemin: string;
  taille: number;
}

/**
 * Fichiers d'Alimentation que plus aucun plan ni aucune recette n'utilise :
 * restes d'un PDF remplacé, d'un envoi interrompu ou d'un élément supprimé.
 */
export async function trouverFichiersOrphelins(): Promise<FichierOrphelin[]> {
  const admin = createSupabaseAdminClient();
  const [plans, recettes] = await Promise.all([
    admin.from("ttl_plans_alimentaires").select("pdf_url, pages, miniatures"),
    admin.from("ttl_recettes").select("photo_url, miniature_url"),
  ]);
  if (plans.error || recettes.error) throw new Error("Lecture des plans et recettes impossible");

  const utilises = new Set<string>();
  const garder = (url: string | null) => {
    const f = fichierDepuisUrl(url);
    if (f) utilises.add(`${f.bucket}/${f.chemin}`);
  };
  for (const p of plans.data ?? []) {
    garder(p.pdf_url);
    (p.pages as string[]).forEach(garder);
    (p.miniatures as string[]).forEach(garder);
  }
  for (const r of recettes.data ?? []) {
    garder(r.photo_url);
    garder(r.miniature_url);
  }

  const orphelins: FichierOrphelin[] = [];
  for (const bucket of BUCKETS) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(bucket).list("", { limit: 1000, offset });
      if (error) throw new Error(error.message);
      for (const f of data ?? []) {
        if (!f.id || !NOM_ALIMENTATION.test(f.name) || utilises.has(`${bucket}/${f.name}`)) continue;
        orphelins.push({ bucket, chemin: f.name, taille: Number(f.metadata?.size ?? 0) });
      }
      if (!data || data.length < 1000) break;
    }
  }
  return orphelins;
}
