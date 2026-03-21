import { createSupabaseServerClient } from "@/lib/supabase-server";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const firstName = session?.user.user_metadata?.prenom
    ?? session?.user.email?.split("@")[0]
    ?? "";

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader />

      <div className="mx-auto" style={{ maxWidth: 480 }}>

        {/* Greeting */}
        <div style={{ padding: "20px 16px 6px" }}>
          <p className="font-body text-sm" style={{ color: "#555" }}>
            Bonjour,{" "}
            <span style={{ color: "#F5F5F0", fontWeight: 700 }}>{firstName}</span>
          </p>
        </div>

        {/* Section title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 16px" }}>
          <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h2
            className="font-title"
            style={{ fontSize: "1.45rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em" }}
          >
            MES MODULES
          </h2>
        </div>

        {/* Placeholder modules */}
        <div
          style={{
            margin: "0 16px",
            backgroundColor: "#111",
            border: "1px solid #1a1a1a",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p className="font-body" style={{ fontWeight: 700, fontSize: "0.9rem", color: "#F5F5F0" }}>
            Aucun module pour l&apos;instant
          </p>
          <p className="font-body" style={{ fontSize: "0.8rem", color: "#555", marginTop: 4 }}>
            Tes modules apparaîtront ici au fur et à mesure.
          </p>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
