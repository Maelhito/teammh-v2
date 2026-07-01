import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserProfile } from "@/lib/user-profile";
import { getClienteOffre } from "@/lib/tts-client";
import ProfilClient from "./ProfilClient";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [profile, offre] = await Promise.all([
    getUserProfile(user!.id),
    getClienteOffre(user!.id),
  ]);

  return (
    <ProfilClient
      email={user!.email ?? ""}
      prenom={profile?.prenom ?? ""}
      nom={profile?.nom ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
      offre={offre}
    />
  );
}
