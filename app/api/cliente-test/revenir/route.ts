import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/is-admin";
import { ouvrirSessionSur, proprietaireDuTest } from "@/lib/cliente-test";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  const coachId = proprietaireDuTest(user);
  if (!coachId) return NextResponse.redirect(`${origin}/login`);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(coachId);
  if (error || !data.user?.email) return NextResponse.redirect(`${origin}/login`);

  try {
    await ouvrirSessionSur(admin, session, data.user.email);
  } catch (e) {
    console.error("[cliente-test/revenir]", e);
    return NextResponse.redirect(`${origin}/login`);
  }

  return NextResponse.redirect(`${origin}${isAdminUser(data.user) ? "/admin" : "/coach"}`);
}
