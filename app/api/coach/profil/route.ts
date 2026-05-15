import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { prenom, nom, specialite, bio, telephone, lien_zoom } = await req.json();

  const { error } = await supabase.auth.updateUser({
    data: { prenom, nom, specialite, bio, telephone, lien_zoom },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { timezone } = await req.json();
  if (!timezone) return NextResponse.json({ error: "timezone requis" }, { status: 400 });

  const { error } = await supabase.auth.updateUser({ data: { timezone } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
