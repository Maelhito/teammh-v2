"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ttlColors } from "@/lib/ttl-theme";

export default function TtlSignOutButton() {
  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleSignOut}
      className="font-body"
      style={{
        width: "100%",
        marginTop: 24,
        padding: "14px 0",
        background: ttlColors.card,
        border: `1px solid ${ttlColors.cardBorder}`,
        borderRadius: 16,
        color: ttlColors.redBright,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Se déconnecter
    </button>
  );
}
