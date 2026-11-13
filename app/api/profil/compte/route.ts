import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/is-admin";
import { supprimerCompteCliente } from "@/lib/suppression-compte";

export const dynamic = "force-dynamic";

const MOT_DE_CONFIRMATION = "SUPPRIMER";

/**
 * La cliente connectée supprime son propre compte, définitivement.
 *
 * Réservé aux clientes : un coach ou un admin qui regarde l'app « comme une
 * cliente » (mode aperçu) reste connecté avec SON compte — sans ce garde-fou,
 * le bouton effacerait le sien.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body?.confirmation !== MOT_DE_CONFIRMATION) {
    return NextResponse.json({ error: "Confirmation manquante." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profil } = await admin.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  const roles = [profil?.role, user.user_metadata?.role].filter(Boolean);
  const estCliente = !isAdminUser(user) && roles.every((r) => r === "cliente");
  if (!estCliente) {
    return NextResponse.json(
      { error: "Un compte de l'équipe ne se supprime pas depuis l'app." },
      { status: 403 },
    );
  }

  const resultat = await supprimerCompteCliente(admin, user);
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.erreur }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
