import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendPushToAll } from "@/lib/push";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: "title et body requis" }, { status: 400 });
  }

  await sendPushToAll({ title, body, url: "/dashboard" });

  return NextResponse.json({ success: true });
}
