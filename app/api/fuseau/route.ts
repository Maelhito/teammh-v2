import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { estFuseauValide } from "@/lib/temps";
import { getFuseau, setFuseau } from "@/lib/temps-serveur";

export const dynamic = "force-dynamic";

/**
 * Le fuseau de la personne connectée — cliente, coach ou admin.
 *
 * On passe volontairement par `auth.getUser()` et non par `getEffectiveUser` :
 * quand un coach regarde l'app en mode aperçu, c'est SON appareil qui parle, et
 * il ne doit surtout pas réécrire le fuseau de la cliente qu'il observe.
 */

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const timezone = await getFuseau(user.id);

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("timezone, timezone_auto")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    timezone,
    // Un profil sans fuseau enregistré est en automatique par défaut : c'est
    // ce que veut la quasi-totalité des gens, et ça se corrige à la main.
    auto: data?.timezone_auto !== false,
    enregistre: !!data?.timezone,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { timezone, auto } = body as { timezone?: unknown; auto?: unknown };

  if (!estFuseauValide(timezone)) {
    return NextResponse.json({ error: "Fuseau horaire invalide" }, { status: 400 });
  }

  // `auto` absent = détection automatique (le cas de loin le plus fréquent).
  const estAuto = auto !== false;
  const resultat = await setFuseau(user.id, timezone, estAuto);

  return NextResponse.json({ success: true, ...resultat });
}
