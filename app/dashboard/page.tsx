import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getModules } from "@/lib/modules";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const firstName = session?.user.user_metadata?.prenom
    ?? session?.user.email?.split("@")[0]
    ?? "";

  const modules = getModules();

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
          <h2 className="font-title" style={{ fontSize: "1.45rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em" }}>
            MES MODULES
          </h2>
          <span className="font-body" style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#555" }}>
            {modules.length} module{modules.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Module cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
          {modules.map((module, i) => (
            <Link key={module.slug} href={`/modules/${module.slug}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "#111111",
                  borderRadius: 12,
                  border: "1px solid #1a1a1a",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span className="font-title" style={{ fontSize: "1.1rem", color: "#B22222", flexShrink: 0, lineHeight: 1 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p className="font-body" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#F5F5F0", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {module.title}
                    </p>
                    <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", marginTop: 2 }}>
                      {module.category}{module.duration ? ` · ${module.duration}` : ""}
                    </p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B22222" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
