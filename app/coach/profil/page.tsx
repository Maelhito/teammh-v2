import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import ProfilCoachClient from "./ProfilCoachClient";

export const dynamic = "force-dynamic";

export default async function CoachProfilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // En dev, on bypasse le check de session
  if (!session && process.env.NODE_ENV !== "development") redirect("/login");

  const user = session?.user;
  const meta = user?.user_metadata ?? {};

  // Le lien Zoom qui compte est celui de la fiche d'équipe : c'est lui que lit
  // le calendrier, la fiche cliente et le bouton « Rejoindre Zoom ». On affiche
  // donc celui-là, pour que le champ dise la vérité sur ce que voient les
  // clientes. Le lien du compte ne sert plus que de secours.
  const teamMemberIds: string[] = Array.isArray(meta.team_member_ids) ? meta.team_member_ids : [];
  let lienZoomEquipe: string | null = null;
  if (teamMemberIds.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("team_members")
      .select("lien_zoom")
      .in("id", teamMemberIds)
      .not("lien_zoom", "is", null)
      .limit(1);
    lienZoomEquipe = data?.[0]?.lien_zoom ?? null;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Portail coach
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>
          Mon profil
        </h1>
      </div>

      <ProfilCoachClient
        prenom={meta.prenom ?? ""}
        nom={meta.nom ?? ""}
        email={user?.email ?? "mael.ld@hotmail.fr"}
        role={meta.role ?? "coach"}
        specialite={meta.specialite ?? ""}
        bio={meta.bio ?? ""}
        telephone={meta.telephone ?? ""}
        lien_zoom={lienZoomEquipe ?? meta.lien_zoom ?? ""}
      />
    </div>
  );
}
