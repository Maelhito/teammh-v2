import BoutonDeconnexion from "./BoutonDeconnexion";

/**
 * Écran montré à un coach ou un admin qui se connecte dans l'app des stores :
 * elle ne contient que l'app clientes, l'espace équipe reste sur le site.
 */
export default function EspaceEquipePage() {
  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div className="font-body" style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <h1 className="font-title" style={{ color: "#F5F5F0", fontSize: "1.8rem", letterSpacing: "0.04em", margin: "0 0 12px" }}>
          ESPACE ÉQUIPE
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
          Cette application est réservée aux clientes. L&apos;espace coach et admin s&apos;ouvre depuis le site, dans ton navigateur.
        </p>
        <BoutonDeconnexion />
      </div>
    </div>
  );
}
