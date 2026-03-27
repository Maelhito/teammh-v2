import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserProfile, getModuleCompletions } from "@/lib/user-profile";
import { getModules } from "@/lib/modules";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const userId = session?.user.id ?? "";
  const email = session?.user.email ?? "";

  const [profile, completedSlugs] = await Promise.all([
    userId ? getUserProfile(userId) : Promise.resolve(null),
    userId ? getModuleCompletions(userId) : Promise.resolve([]),
  ]);

  const totalModules = getModules().length;

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader back backHref="/dashboard" />

      <div style={{ padding: "16px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ display: "inline-block", width: 3, height: 20, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h1 className="font-title" style={{ fontSize: "1.6rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em", margin: 0 }}>
            MON PROFIL
          </h1>
        </div>
      </div>

      <ProfileClient
        initialProfile={profile}
        email={email}
        completedCount={completedSlugs.length}
        totalModules={totalModules}
      />

      <BottomNav />
    </div>
  );
}
