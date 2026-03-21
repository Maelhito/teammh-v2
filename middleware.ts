import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function middleware(request: NextRequest) {
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
  const { pathname } = request.nextUrl;
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Laisse passer les routes auth sans vérification
  if (pathname.startsWith("/auth")) {
    return response;
  }

  // Non connecté → /login
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  // Admin sur /dashboard → /admin
  if (user && isAdmin && pathname.startsWith("/dashboard")) {
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
