import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET — la cliente a-t-elle déjà répondu au badge avis Google ?
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("avis_google_reponses")
    .select("id")
    .eq("user_id", session.user.id)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responded: (data?.length ?? 0) > 0 });
}

// POST — la cliente répond au badge : "J'adore !" (positif) ou un message (mitige)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { reponse, message } = await req.json();
  if (reponse !== "positif" && reponse !== "mitige") {
    return NextResponse.json({ error: "Réponse invalide" }, { status: 400 });
  }
  if (reponse === "mitige" && !message?.trim()) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("avis_google_reponses").insert({
    user_id: session.user.id,
    reponse,
    message: reponse === "mitige" ? message.trim() : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
