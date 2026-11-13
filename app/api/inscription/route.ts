import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans, fuseauOuDefaut } from "@/lib/temps";
import { rattacherUnCompte } from "@/lib/equipe-comptes";
import { codeCoachValide } from "@/lib/invitation-coach";

export async function POST(req: NextRequest) {
  const { prenom, nom, email, password, role = "cliente", timezone, code } = await req.json();
  const safeRole = ["cliente", "coach"].includes(role) ? role : "cliente";

  // Un compte coach ne se crée qu'avec le lien d'invitation fourni par l'admin :
  // sans ce contrôle, `?role=coach` suffisait à n'importe qui.
  if (safeRole === "coach" && !codeCoachValide(code)) {
    return NextResponse.json(
      { error: "Ce lien d'inscription coach n'est plus valable. Demande un nouveau lien à Maël." },
      { status: 403 },
    );
  }

  if (!prenom || !email || !password) {
    return NextResponse.json({ error: "Prénom, email et mot de passe requis." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
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
    date_demarrage: dateDemarrage,
    timezone: fuseau,
    timezone_auto: true,
    role: safeRole,
  }, { onConflict: "user_id" });

  // Une coach inscrite par le lien coach doit exister aussi comme fiche équipe :
  // sans elle, l'admin ne peut pas lui attribuer de clientes, et elle n'en voit
  // aucune de son côté.
  if (safeRole === "coach") {
    await rattacherUnCompte(admin, data.user);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
