import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachProfilPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { user } = session;
  const prenom = user.user_metadata?.prenom ?? "";
  const nom = user.user_metadata?.nom ?? "";

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", margin: "0 0 24px", fontFamily: "system-ui" }}>
        👤 Mon profil
      </h1>
      <div style={{ backgroundColor: "#fff", borderRadius: 14, border: "1px solid #e8e8e8", padding: "24px", maxWidth: 480 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Prénom", value: prenom || "—" },
            { label: "Nom", value: nom || "—" },
            { label: "Email", value: user.email ?? "—" },
            { label: "Rôle", value: user.user_metadata?.role ?? "coach" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: "#aaa", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "system-ui" }}>{label}</p>
              <p style={{ fontSize: 15, color: "#1a1a1a", margin: 0, fontFamily: "system-ui" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
