import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

// Routes accessibles sans session — vérifiées en premier, sans appel réseau
const PUBLIC_PATHS = ["/login", "/auth/confirm", "/auth/set-password", "/acces-suspendu", "/inscription"];

// Routes protégées pour les clientes (vérification statut)
const CLIENT_PROTECTED = ["/dashboard", "/profil", "/modules", "/calendrier", "/mesures"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin embed : /coach/* → /admin/coach/* si cookie admin_mode présent
  // (fonctionne en dev et prod, sans appel Supabase)
  if (
    pathname.startsWith("/coach") &&
    !pathname.startsWith("/coach/layout") &&
    request.cookies.get("admin_mode")?.value === "1"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin" + pathname;
    return NextResponse.redirect(url);
  }

  const isDev = process.env.NODE_ENV === "development";

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.email === ADMIN_EMAIL;

  function redirect(to: string) {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value));
    return r;
  }

  // Non connecté → /login (en dev, on laisse naviguer sans session pour tester les pages)
  const PROTECTED = ["/dashboard", "/admin", "/profil", "/modules", "/calendrier", "/mesures", "/coach", "/tts"];
  if (!isDev && !user && PROTECTED.some((p) => pathname.startsWith(p))) {
    return redirect("/login");
  }

  if (!user) return response;

  // Rôle lu depuis la DB à chaque requête → changement immédiat sans reconnexion
  const NEEDS_ROLE = ["/dashboard", "/admin", "/coach", "/profil", "/modules", "/calendrier", "/mesures", "/tts"];
  let role = "cliente";
  if (!isAdmin && NEEDS_ROLE.some((p) => pathname.startsWith(p))) {
    try {
      const profileRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${user.id}&select=statut,role,acces_app`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        }
      );
      const [profile] = await profileRes.json().catch(() => [null]);
      role = profile?.role ?? user.user_metadata?.role ?? "cliente";

      // Statut suspendu
      const statut = profile?.statut ?? "active";
      if (!isDev && (statut === "pause" || statut === "terminee")) return redirect("/acces-suspendu");

      // Accès révoqué depuis l'admin (bascule « accès à l'app »).
      // Ne s'applique qu'aux clientes : un coach ou un admin n'a pas forcément
      // ce drapeau à true dans son profil, et le verrouiller l'enfermerait dehors.
      // Absent = accès autorisé, comme le fait déjà l'API admin.
      if (!isDev && role === "cliente" && profile?.acces_app === false) {
        return redirect("/acces-suspendu");
      }
    } catch {
      role = user.user_metadata?.role ?? "cliente";
    }
  }

  const isCoach = role === "coach";
  const isRoleAdmin = role === "admin";

  // Redirection post-login selon rôle (désactivée en dev pour ne pas gêner les tests coach/admin)
  const isPreview = request.nextUrl.searchParams.get("preview") === "1";
  if (!isDev && pathname.startsWith("/dashboard") && !isPreview) {
    if (isAdmin || isRoleAdmin) return redirect("/admin");
    if (isCoach) return redirect("/coach");
  }

  // Aiguillage cliente selon l'offre (TTS ↔ TTM) — actif en dev ET en prod dès qu'une
  // session existe, pour ne jamais confondre les deux interfaces.
  if (!isAdmin && !isCoach && !isRoleAdmin && !isPreview && (pathname.startsWith("/dashboard") || pathname.startsWith("/tts"))) {
    try {
      const offreRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/offres_clientes?user_id=eq.${user.id}&select=offre`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        }
      );
      const [offreRow] = await offreRes.json().catch(() => [null]);
      const offre = offreRow?.offre ?? "TTM";
      if (pathname.startsWith("/dashboard") && offre === "TTS") return redirect("/tts");
      if (pathname.startsWith("/tts") && offre !== "TTS") return redirect("/dashboard");
    } catch {}
  }

  if (!isDev) {
    // Protection /coach → uniquement coach ou admin
    if (pathname.startsWith("/coach")) {
      if (!isCoach && !isAdmin && !isRoleAdmin) return redirect("/dashboard");
    }

    // Protection /admin → uniquement admin
    if (pathname.startsWith("/admin") && !isAdmin && !isRoleAdmin) return redirect("/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
