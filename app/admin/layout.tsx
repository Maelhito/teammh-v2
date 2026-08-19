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
        {/* Pas d'overflow-y : il créerait un conteneur de défilement qui
            neutraliserait le `position: sticky` de l'en-tête de fiche cliente. */}
        <main
          className="admin-main"
          style={{ flex: 1, minWidth: 0, padding: "32px 28px", color: "var(--admin-text)" }}
        >
          {children}
        </main>
        <style>{`
          /* Variables de l'en-tête collant de la fiche cliente, que ce portail
             partage avec le portail coach (voir .coach-cliente-header). */
          .admin-main {
            --fiche-pad-y: 32px; --fiche-pad-x: 28px; --fiche-top: 0px;
            --fiche-bg: var(--admin-bg); --fiche-border: var(--admin-border);
          }
          /* Le nom est écrit en noir en dur dans la fiche (pensée pour le fond
             clair du portail coach) : illisible sur le thème sombre admin. */
          .admin-main .coach-cliente-header h1 { color: var(--admin-text) !important; }
          @media (max-width: 768px) {
            .admin-main { padding: 80px 16px 40px !important; }
            /* barre mobile admin : 59px de haut → top = 59 - 80 */
            .admin-main { --fiche-pad-y: 80px; --fiche-pad-x: 16px; --fiche-top: -21px; }
          }
        `}</style>
      </div>
    </AdminThemeProvider>
  );
}
