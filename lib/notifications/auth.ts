import { NextRequest } from "next/server";

/**
 * Un cron n'est légitime que s'il présente le secret. En développement, on
 * laisse passer pour pouvoir le déclencher à la main.
 *
 * Note pour le diagnostic : un déclencheur externe qui échoue en « Erreur
 * HTTP » sans autre détail renvoie presque toujours 401 ici — c'est que
 * l'en-tête `Authorization: Bearer <CRON_SECRET>` manque ou ne correspond pas.
 */
export function cronAutorise(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const attendu = process.env.CRON_SECRET;
  if (!attendu) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${attendu}`) return true;

  // Certains planificateurs externes ne permettent pas d'en-tête personnalisé :
  // on accepte aussi le secret en paramètre d'URL.
  return request.nextUrl.searchParams.get("secret") === attendu;
}
