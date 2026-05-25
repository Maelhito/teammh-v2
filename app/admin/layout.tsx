import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/is-admin";
import AdminSidebar from "./AdminSidebar";
import { AdminThemeProvider } from "./ThemeProvider";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminUser(user)) redirect("/login");
  }

  return (
    <AdminThemeProvider>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--admin-bg)" }}>
        <AdminSidebar />
        <main
          className="admin-main"
          style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "32px 28px", color: "var(--admin-text)" }}
        >
          {children}
        </main>
        <style>{`
          @media (max-width: 768px) {
            .admin-main { padding: 80px 16px 40px !important; }
          }
        `}</style>
      </div>
    </AdminThemeProvider>
  );
}
