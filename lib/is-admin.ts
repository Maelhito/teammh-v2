const ADMIN_EMAIL = "mael.ld@hotmail.fr";

type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null | undefined;

export function isAdminUser(user: UserLike): boolean {
  if (!user) return false;
  if (user.email === ADMIN_EMAIL) return true;
  return (user.user_metadata?.role ?? "cliente") === "admin";
}

export { ADMIN_EMAIL };
