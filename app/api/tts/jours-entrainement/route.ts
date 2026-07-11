import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getJoursEntrainement, setJoursEntrainement } from "@/lib/tts";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const jours = await getJoursEntrainement(user.id);
  return NextResponse.json({ jours });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { jours } = await request.json();
  if (!Array.isArray(jours) || jours.some((j) => !Number.isInteger(j) || j < 0 || j > 6)) {
    return NextResponse.json({ error: "jours invalides" }, { status: 400 });
  }

  await setJoursEntrainement(user.id, jours);
  return NextResponse.json({ success: true });
}
