import { createSupabaseServerClient } from "@/lib/supabase-server";
import InviteForm from "./InviteForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div
      style={{
        backgroundColor: "#0D0D0D",
        minHeight: "100vh",
        color: "#FFFFFF",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.05em" }}>
        MON ESPACE
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
        Connecté en tant que {session?.user.email}
      </p>
      <InviteForm />

      {/* Modules à venir */}
      <p style={{ color: "rgba(255,255,255,0.3)", marginTop: 40, textAlign: "center", fontSize: 14 }}>
        Les modules arrivent bientôt...
      </p>
    </div>
  );
}
