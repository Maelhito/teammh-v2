import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const OBJECTIF_VALUES = ["perdre_poids", "se_muscler", "energie", "habitudes", "autre"];

export async function POST(req: NextRequest) {
  const { prenom, nom, email, password, objectif } = await req.json();

  if (!prenom || !email || !password) {
    return NextResponse.json({ error: "Prénom, email et mot de passe requis." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }
  if (!objectif || !OBJECTIF_VALUES.includes(objectif)) {
    return NextResponse.json({ error: "Choisis ton objectif." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom: nom ?? "", role: "cliente" },
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("already")
      ? "Un compte existe déjà avec cet email."
      : "Impossible de créer le compte.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await admin.from("user_profiles").upsert({
    user_id: data.user.id,
    prenom,
    nom: nom ?? "",
    statut: "active",
    acces_app: true,
    date_demarrage: new Date().toISOString().slice(0, 10),
    role: "cliente",
  }, { onConflict: "user_id" });

  const dateDebut = new Date().toISOString().slice(0, 10);
  await admin.from("offres_clientes").upsert({
    user_id: data.user.id,
    offre: "TTL",
    date_debut: dateDebut,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  await admin.from("offres_clientes_historique").insert({
    user_id: data.user.id,
    offre_avant: null,
    offre_apres: "TTL",
    hors_ordre: false,
    confirmed_by: "auto-inscription",
  });

  await admin.from("tts_objectifs").upsert({
    user_id: data.user.id,
    objectif,
  }, { onConflict: "user_id" });

  return NextResponse.json({ success: true }, { status: 201 });
}
