import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase-server";

const DEV_USER = {
  id: "dev-user-id",
  email: "mael.ld@hotmail.fr",
  user_metadata: { role: "coach" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "",
} as const;

export async function checkCoachAccess() {
  if (process.env.NODE_ENV === "development") return DEV_USER;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? "cliente";
  if (role !== "coach" && role !== "admin" && user.email !== "mael.ld@hotmail.fr") return null;
  return user;
}

/**
 * La bibliothèque partagée — programmes, séances, exercices, vidéos de groupe —
 * n'appartient à personne en particulier : tout le monde y puise. Un coach la
 * consulte et l'assigne, mais ne la modifie, ne la duplique ni ne la supprime.
 * Ses adaptations pour une cliente vivent dans la copie de cette cliente
 * (`client_programmes.grid_data`), jamais dans le modèle d'origine.
 *
 * Seuls les admins (dont mael.ld@hotmail.fr) y touchent.
 */
export function isCoachOnly(user: { user_metadata?: { role?: string }; email?: string }) {
  if (user.email === "mael.ld@hotmail.fr") return false;
  const role = user.user_metadata?.role ?? "cliente";
  return role === "coach";
}

/**
 * Refus prêt à renvoyer quand un coach tente une écriture sur la bibliothèque.
 * `action` complète la phrase : « Seul un admin peut <action>. »
 *
 * Renvoie null quand l'utilisateur a le droit — l'appel s'écrit donc :
 *   const refus = refusSiCoach(user, "modifier un programme");
 *   if (refus) return refus;
 */
export function refusSiCoach(
  user: { user_metadata?: { role?: string }; email?: string },
  action: string,
): NextResponse | null {
  if (!isCoachOnly(user)) return null;
  return NextResponse.json({ error: `Seul un admin peut ${action}.` }, { status: 403 });
}
