import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FUSEAU_PAR_DEFAUT, aujourdhuiDans, fuseauOuDefaut } from "@/lib/temps";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export interface QuizAnswers {
  prenom: string;
  nom?: string;
  email: string;
  password: string;
  poids?: number | null;
  poidsVise?: number | null;
  frein?: string | null;
  pretADemarrer?: boolean | null;
  timezone?: string | null;
}

export interface Abonnement {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  offerSlug: string | null;
  status: string;
  currentPeriodEnd: string | null;
}

/** Cherche un compte déjà existant pour cet email (paiement rejoué, double clic...). */
export async function trouverUserIdParEmail(admin: Admin, email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=500`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const users: { id: string; email?: string }[] = json.users ?? json ?? [];
    return users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Crée le compte, le profil et toutes les réponses du quiz — appelé une fois
 * le paiement Stripe confirmé (jamais avant : voir /api/inscription-ttl/finaliser).
 */
export async function creerCompteTtl(
  reponses: QuizAnswers,
  abonnement: Abonnement
): Promise<{ userId: string } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const { prenom, nom, email, password, poids, poidsVise, frein, pretADemarrer, timezone } = reponses;

  const fuseau = fuseauOuDefaut(timezone ?? null, FUSEAU_PAR_DEFAUT);
  const dateDemarrage = aujourdhuiDans(fuseau);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { prenom, nom: nom ?? "", role: "cliente" },
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      return { error: "Un compte existe déjà avec cet email. Connecte-toi directement." };
    }
    return { error: "Impossible de créer le compte." };
  }

  const userId = data.user.id;

  await admin.from("user_profiles").upsert({
    user_id: userId,
    prenom,
    nom: nom ?? "",
    statut: "active",
    acces_app: true,
    date_demarrage: dateDemarrage,
    timezone: fuseau,
    timezone_auto: true,
    role: "cliente",
  }, { onConflict: "user_id" });

  const ligneOffre = {
    user_id: userId,
    offre: "TTL",
    date_debut: dateDemarrage,
    updated_at: new Date().toISOString(),
  };
  const { error: offreError } = await admin
    .from("offres_clientes")
    .upsert({ ...ligneOffre, paiement_requis: true }, { onConflict: "user_id" });
  if (offreError) {
    await admin.from("offres_clientes").upsert(ligneOffre, { onConflict: "user_id" });
  }

  await admin.from("offres_clientes_historique").insert({
    user_id: userId,
    offre_avant: null,
    offre_apres: "TTL",
    hors_ordre: false,
    confirmed_by: "auto-inscription-stripe",
  });

  await admin.from("ttl_objectifs").upsert({
    user_id: userId,
    objectif: "perdre_poids",
    frein: frein && frein.trim() ? frein.trim().slice(0, 500) : null,
    pret_a_demarrer: typeof pretADemarrer === "boolean" ? pretADemarrer : null,
    poids_vise: typeof poidsVise === "number" ? poidsVise : null,
  }, { onConflict: "user_id" });

  if (typeof poids === "number" && poids > 0) {
    await admin.from("mesures").upsert({
      user_id: userId,
      date: dateDemarrage,
      poids,
    }, { onConflict: "user_id,date" });
  }

  // Le paiement a déjà eu lieu avant la création du compte : on ne dépend pas
  // du webhook pour ouvrir l'accès, on écrit l'abonnement directement avec ce
  // que Stripe vient de renvoyer.
  await admin.from("ttl_subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: abonnement.stripeCustomerId,
    stripe_subscription_id: abonnement.stripeSubscriptionId,
    offer_slug: abonnement.offerSlug,
    status: abonnement.status,
    current_period_end: abonnement.currentPeriodEnd,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return { userId };
}
