/**
 * Vrai si l'erreur Supabase signifie « table absente » — c'est-à-dire que la
 * migration sql/questionnaire_demarrage.sql n'a pas encore été lancée.
 * Dans ce cas on affiche "pas encore rempli" plutôt qu'une erreur technique.
 *
 * 42P01   : code Postgres "undefined_table"
 * PGRST205: PostgREST ne trouve pas la table dans son cache de schéma
 */
export function isMissingTableError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return (error.message ?? "").includes("Could not find the table");
}
