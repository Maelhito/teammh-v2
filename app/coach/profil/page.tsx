import { createSupabaseServerClient } from "@/lib/supabase-server";
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
      />
    </div>
  );
}
