import type { createSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Bucket des photos de progression — PRIVÉ.
 * Ce sont des photos corporelles : jamais d'URL publique, uniquement des URLs
 * signées à durée limitée, générées pour la cliente elle-même ou pour son coach.
 */
export const BUCKET_PHOTOS = "photos-progression";

/** Durée de validité d'une URL signée (1 heure) */
export const SIGNED_URL_TTL = 60 * 60;

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** Crée le bucket privé s'il n'existe pas encore */
export async function ensurePhotoBucket(admin: AdminClient): Promise<void> {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_PHOTOS)) {
    await admin.storage.createBucket(BUCKET_PHOTOS, { public: false });
  }
}

/** URL signée temporaire pour un chemin donné (null si échec) */
export async function signedUrl(admin: AdminClient, path: string): Promise<string | null> {
  const { data } = await admin.storage.from(BUCKET_PHOTOS).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export interface PhotoRow {
  id: string;
  date: string;
  angle: string;
  path: string;
}

export interface PhotoSignee {
  id: string;
  date: string;
  angle: string;
  /** URL signée temporaire — le chemin brut n'est jamais exposé */
  url: string;
}

/** Signe une liste de photos ; celles dont la signature échoue sont écartées */
export async function signPhotos(admin: AdminClient, rows: PhotoRow[]): Promise<PhotoSignee[]> {
  const signed = await Promise.all(
    rows.map(async ({ id, date, angle, path }) => {
      const url = await signedUrl(admin, path);
      return url ? { id, date, angle, url } : null;
    })
  );
  return signed.filter((p): p is PhotoSignee => p !== null);
}
