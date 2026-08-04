import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { updateTtlStreak, grantStreakFreezeIfEligible } from "@/lib/ttl-streak";

function parseBody(videoId: unknown, semaine: unknown) {
  if (!videoId || typeof videoId !== "string") return null;
  const s = Number(semaine);
  if (!Number.isInteger(s) || s < 1 || s > 4) return null;
  return { videoId, semaine: s };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { videoId, semaine } = await request.json();
  const parsed = parseBody(videoId, semaine);
  if (!parsed) return NextResponse.json({ error: "videoId et semaine (1-4) requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("tts_seances_progress")
    .upsert({ user_id: user.id, video_id: parsed.videoId, semaine: parsed.semaine }, { onConflict: "user_id,video_id,semaine" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { streak, freezeUsed } = await updateTtlStreak(user.id);

  const { count } = await admin
    .from("tts_seances_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  await grantStreakFreezeIfEligible(user.id, count ?? 0);

  return NextResponse.json({ success: true, streak, freezeUsed });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { videoId, semaine } = await request.json();
  const parsed = parseBody(videoId, semaine);
  if (!parsed) return NextResponse.json({ error: "videoId et semaine (1-4) requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("tts_seances_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("video_id", parsed.videoId)
    .eq("semaine", parsed.semaine);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
