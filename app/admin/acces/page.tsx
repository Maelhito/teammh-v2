import Link from "next/link";
import RolesTable from "../RolesTable";

export const dynamic = "force-dynamic";

export default function AdminAccesPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Permissions
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          🔑 Accès & Rôles
        </h1>
      </div>

      {/* Liens rapides */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 36 }}>
        {[
          { href: "/inscription", label: "Lien inscription", desc: "À partager aux clientes", color: "#B22222" },
          { href: "/admin",       label: "Lien admin",       desc: "Espace administrateur",   color: "#3B82F6" },
          { href: "/coach",       label: "Lien coach",       desc: "Portail coach",            color: "#10B981" },
        ].map(({ href, label, desc, color }) => (
          <Link key={href} href={href} style={{
            display: "block", padding: "14px 16px", borderRadius: 10, textDecoration: "none",
            backgroundColor: "#161616", border: `1px solid ${color}30`,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color, margin: "0 0 2px", fontFamily: "system-ui" }}>{label}</p>
            <p style={{ fontSize: 11, color: "#555", margin: "0 0 6px", fontFamily: "system-ui" }}>{desc}</p>
            <code style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>
              teammj-v2.vercel.app{href}
            </code>
          </Link>
        ))}
      </div>

      <RolesTable />
    </div>
  );
}
