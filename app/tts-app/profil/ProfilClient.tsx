"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";

const OFFRE_LABEL: Record<string, string> = { TTS: "Time To Start", TTM: "Time To Move", TTL: "Time To Last" };

export default function ProfilClient({ email, prenom, nom, avatarUrl, offre }: {
  email: string; prenom: string; nom: string; avatarUrl: string | null; offre: string | null;
}) {
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ padding: "24px 20px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <div style={{
          width: 84, height: 84, borderRadius: "50%", border: "2px solid rgba(178,34,34,0.4)", backgroundColor: "#1A1414",
          backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
        }}>
          {!avatarUrl && <span className="font-title" style={{ fontSize: 24, color: "#F5F5F0" }}>{(prenom || email).charAt(0).toUpperCase()}</span>}
        </div>
        <p className="font-body" style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>{prenom} {nom}</p>
        <p className="font-body" style={{ color: "#8A8078", fontSize: 12, margin: "2px 0 8px" }}>{email}</p>
        {offre && (
          <span className="font-body" style={{ backgroundColor: "rgba(178,34,34,0.15)", border: "1px solid #B22222", color: "#E63946", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, letterSpacing: "0.06em" }}>
            {OFFRE_LABEL[offre] ?? offre}
          </span>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="font-body"
        style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #2A2020", backgroundColor: "#1A1414", color: "#8A8078", fontSize: 13, cursor: "pointer" }}
      >
        Déconnexion
      </button>
    </div>
  );
}
