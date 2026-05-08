import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0D0D0D" }}>
      <AdminSidebar />
      <main
        className="admin-main"
        style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "32px 28px", color: "#F5F5F0" }}
      >
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .admin-main { padding: 80px 16px 40px !important; }
        }
      `}</style>
    </div>
  );
}
