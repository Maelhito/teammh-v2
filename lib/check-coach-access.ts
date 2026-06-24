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

// Le coach n'a pas le droit de supprimer programmes / séances / vidéos de groupe / exercices.
// Seul l'admin (ou mael.ld@hotmail.fr) peut le faire.
export function isCoachOnly(user: { user_metadata?: { role?: string }; email?: string }) {
  if (user.email === "mael.ld@hotmail.fr") return false;
  const role = user.user_metadata?.role ?? "cliente";
  return role === "coach";
}
