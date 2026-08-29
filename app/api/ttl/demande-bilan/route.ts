import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createDemandeBilan } from "@/lib/ttl";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { message } = await request.json().catch(() => ({ message: null }));
  await createDemandeBilan(user.id, message ? String(message).slice(0, 500) : null);

  return NextResponse.json({ success: true });
}
