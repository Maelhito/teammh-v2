import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

// Routes accessibles sans session — vérifiées en premier, sans appel réseau
const PUBLIC_PATHS = ["/login", "/auth/confirm", "/auth/set-password", "/acces-suspendu", "/inscription"];

// Routes protégées pour les clientes (vérification statut)
const CLIENT_PROTECTED = ["/dashboard", "/profil", "/modules", "/calendrier"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Non connecté → /login
  const PROTECTED = ["/dashboard", "/admin", "/profil", "/modules", "/calendrier", "/coach"];
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    return redirect("/login");
  }

  if (!user) return response;

  // Rôle depuis user_metadata (aucun appel DB supplémentaire)
  const role = (user.user_metadata?.role ?? "cliente") as string;
  const isCoach = role === "coach";

  // Vérification statut pour les clientes
  if (!isAdmin && !isCoach && CLIENT_PROTECTED.some((p) => pathname.startsWith(p))) {
    const profileRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${user.id}&select=statut`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      }
    );
    const [profile] = await profileRes.json().catch(() => [null]);
    const statut = profile?.statut ?? "active";
    if (statut === "pause" || statut === "terminee") return redirect("/acces-suspendu");
  }

  // Redirection post-login selon rôle (/dashboard → destination finale)
  const isPreview = request.nextUrl.searchParams.get("preview") === "1";
  if (pathname.startsWith("/dashboard") && !isPreview) {
    if (isAdmin) return redirect("/admin");
    if (isCoach) return redirect("/coach");
  }

  // Protection /coach → uniquement coach ou admin
  if (pathname.startsWith("/coach")) {
    if (!isCoach && !isAdmin) return redirect("/dashboard");
  }

  // Protection /admin → uniquement admin
  if (pathname.startsWith("/admin") && !isAdmin) return redirect("/dashboard");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
