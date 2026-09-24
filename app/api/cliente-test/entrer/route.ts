import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/is-admin";
import { ouvrirSessionSur, trouverOuCreerClienteTest } from "@/lib/cliente-test";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const role = user.user_metadata?.role ?? "cliente";
  if (role !== "coach" && !isAdminUser(user)) return NextResponse.redirect(`${origin}/dashboard`);

  const admin = createSupabaseAdminClient();
  try {
    const test = await trouverOuCreerClienteTest(admin, user);
    await ouvrirSessionSur(admin, session, test.email!);
  } catch (e) {
    console.error("[cliente-test/entrer]", e);
    return NextResponse.redirect(`${origin}/coach?erreur=cliente-test`);
  }

  // Un aperçu en cours ferait afficher une autre cliente que la sienne.
  (await cookies()).delete("preview_user_id");
  return NextResponse.redirect(`${origin}/dashboard`);
}
