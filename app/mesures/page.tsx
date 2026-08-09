import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import MesuresClient from "./MesuresClient";

export const dynamic = "force-dynamic";

export default function MesuresPage() {
  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader />

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "28px 16px 14px" }}>
          <span style={{ display: "inline-block", width: 3, height: 18, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h1 className="font-title" style={{ fontSize: "1.1rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.06em", margin: 0 }}>
            MES MESURES
          </h1>
        </div>

        <MesuresClient />
      </div>

      <BottomNav />
    </div>
  );
}
