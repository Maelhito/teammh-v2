import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

function genererMotDePasse() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let mdp = "";
  for (let i = 0; i < 10; i++) {
    mdp += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return mdp;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  let targetUserId: string | null = null;
  let page = 1;
  while (!targetUserId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) targetUserId = found.id;
    if (data.users.length < 1000) break;
    page++;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "Aucun compte avec cet email" }, { status: 404 });
  }

  const nouveauMotDePasse = genererMotDePasse();
  const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, {
    password: nouveauMotDePasse,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, email, password: nouveauMotDePasse });
}
