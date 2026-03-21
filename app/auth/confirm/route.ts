import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  console.log("[auth/confirm] token_hash:", token_hash ? "présent" : "absent", "| type:", type);

  if (!token_hash || !type) {
    console.error("[auth/confirm] Paramètres manquants — vérifie le template email Supabase");
    return NextResponse.redirect(`${origin}/login?error=invalid-token`);
  }

  const redirectResponse = NextResponse.redirect(`${origin}/auth/set-password`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    console.error("[auth/confirm] verifyOtp échoué :", error.message);
    return NextResponse.redirect(`${origin}/login?error=invalid-token`);
  }

  console.log("[auth/confirm] Succès → /auth/set-password");
  return redirectResponse;
}
