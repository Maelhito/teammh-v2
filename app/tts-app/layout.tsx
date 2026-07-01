import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClienteOffre } from "@/lib/tts-client";
import TtsBottomNav from "./TtsBottomNav";

export default async function TtsAppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const offre = await getClienteOffre(user.id);
  if (offre !== "TTS" && offre !== "TTL") redirect("/dashboard");

  return (
    <div style={{ backgroundColor: "var(--noir)", minHeight: "100vh", paddingBottom: 90 }}>
      <div className="mx-auto" style={{ maxWidth: 480 }}>
        {children}
      </div>
      <TtsBottomNav />
    </div>
  );
}
