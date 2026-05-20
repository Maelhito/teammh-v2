import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { prenom, nom, email, password, role = "cliente" } = await req.json();
  const safeRole = ["cliente", "coach"].includes(role) ? role : "cliente";

  if (!prenom || !email || !password) {
    return NextResponse.json({ error: "Prénom, email et mot de passe requis." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom: nom ?? "", role: safeRole },
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("already")
      ? "Un compte existe déjà avec cet email."
      : "Impossible de créer le compte.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Crée le profil dans user_profiles
  await admin.from("user_profiles").upsert({
    user_id: data.user.id,
    prenom,
    nom: nom ?? "",
    statut: "active",
    acces_app: true,
    date_demarrage: new Date().toISOString().slice(0, 10),
    role: safeRole,
  }, { onConflict: "user_id" });

  return NextResponse.json({ success: true }, { status: 201 });
}
