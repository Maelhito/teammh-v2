"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ttsColors } from "@/lib/tts-theme";

export default function TtsSignOutButton() {
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
        background: ttsColors.card,
        border: `1px solid ${ttsColors.cardBorder}`,
        borderRadius: 16,
        color: ttsColors.redBright,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Se déconnecter
    </button>
  );
}
