import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { markVideoWatched } from "@/lib/tts-client";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { video_id } = await request.json();
  if (!video_id) return NextResponse.json({ error: "video_id requis" }, { status: 400 });

  await markVideoWatched(user.id, video_id);
  return NextResponse.json({ success: true });
}
