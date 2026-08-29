import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { updateTtlStreak } from "@/lib/ttl-streak";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { videoId } = await request.json();
  if (!videoId) return NextResponse.json({ error: "videoId requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("ttl_modules_progress")
    .upsert({ user_id: user.id, video_id: videoId }, { onConflict: "user_id,video_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { streak } = await updateTtlStreak(user.id);

  return NextResponse.json({ success: true, streak });
}
