import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

// Routes accessibles sans session — vérifiées en premier, sans appel réseau
const PUBLIC_PATHS = ["/login", "/auth/confirm", "/auth/set-password", "/acces-suspendu"];

// Routes protégées pour les clientes (vérification statut)
const CLIENT_PROTECTED = ["/dashboard", "/profil", "/modules"];

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

  // Non connecté → /login
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/profil") || pathname.startsWith("/modules"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  // Vérification statut pour les clientes sur les routes protégées
  if (user && !isAdmin && CLIENT_PROTECTED.some((p) => pathname.startsWith(p))) {
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

    if (statut === "pause" || statut === "terminee") {
      const url = request.nextUrl.clone();
      url.pathname = "/acces-suspendu";
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
      return redirectResponse;
    }
  }

  // Admin sur /dashboard → /admin (sauf si ?preview=1)
  const isPreview = request.nextUrl.searchParams.get("preview") === "1";
  if (user && isAdmin && pathname.startsWith("/dashboard") && !isPreview) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  // Cliente sur /admin → /dashboard
  if (user && !isAdmin && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
