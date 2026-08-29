import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans, fuseauOuDefaut } from "@/lib/temps";

const OBJECTIF_VALUES = ["perdre_poids", "se_muscler", "energie", "habitudes", "autre"];

export async function POST(req: NextRequest) {
  const { prenom, nom, email, password, objectif, timezone } = await req.json();

  if (!prenom || !email || !password) {
    return NextResponse.json({ error: "Prénom, email et mot de passe requis." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }
  if (!objectif || !OBJECTIF_VALUES.includes(objectif)) {
    return NextResponse.json({ error: "Choisis ton objectif." }, { status: 400 });
  }

  // Le fuseau de l'appareil, capté dès l'inscription : sans lui, la personne
  // hérite du repli jusqu'à sa première ouverture de l'app. Ça compte d'autant
  // plus que l'accompagnement s'ouvre à des clientes en France.
  const fuseau = fuseauOuDefaut(timezone, FUSEAU_PAR_DEFAUT);
  // La date de démarrage est un JOUR LOCAL : calculée en UTC, elle tombait la
  // veille pour une inscription du matin en Nouvelle-Calédonie, et décalait
  // toute la grille du programme d'un jour.
  const dateDemarrage = aujourdhuiDans(fuseau);

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
    date_demarrage: dateDemarrage,
    timezone: fuseau,
    timezone_auto: true,
    role: "cliente",
  }, { onConflict: "user_id" });

  const dateDebut = dateDemarrage;
  // Inscription publique : l'accès reste fermé tant que l'abonnement Stripe
  // n'est pas actif. Une offre attribuée depuis l'Admin, elle, ouvre tout de
  // suite (voir `upsertOffre`).
  const ligneOffre = {
    user_id: data.user.id,
    offre: "TTL",
    date_debut: dateDebut,
    updated_at: new Date().toISOString(),
  };
  const { error: offreError } = await admin
    .from("offres_clientes")
    .upsert({ ...ligneOffre, paiement_requis: true }, { onConflict: "user_id" });
  if (offreError) {
    // Repli tant que la colonne n'existe pas : mieux vaut une inscription qui
    // aboutit qu'un compte à moitié créé.
    await admin.from("offres_clientes").upsert(ligneOffre, { onConflict: "user_id" });
  }

  await admin.from("offres_clientes_historique").insert({
    user_id: data.user.id,
    offre_avant: null,
    offre_apres: "TTL",
    hors_ordre: false,
    confirmed_by: "auto-inscription",
  });

  await admin.from("ttl_objectifs").upsert({
    user_id: data.user.id,
    objectif,
  }, { onConflict: "user_id" });

  return NextResponse.json({ success: true }, { status: 201 });
}
