"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function BoutonDeconnexion() {
  async function deconnecter() {
    await createSupabaseBrowserClient().auth.signOut().catch(() => {});
    window.location.href = "/login";
  }
  return (
    <button
      type="button"
      onClick={deconnecter}
      className="font-body"
      style={{ width: "100%", backgroundColor: "#B22222", color: "#fff", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer" }}
    >
      SE DÉCONNECTER
    </button>
  );
}
