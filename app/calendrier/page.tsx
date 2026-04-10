import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import CalendrierClient from "./CalendrierClient";

export const dynamic = "force-dynamic";

export default async function CalendrierPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id ?? "";

  let events: object[] = [];
  if (userId) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("calendar_events")
      .select("*")
      .or(`target_user_id.is.null,target_user_id.eq.${userId},user_id.eq.${userId}`)
      .order("date", { ascending: true });
    events = data ?? [];
  }

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader />

      <div style={{ padding: "60px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ display: "inline-block", width: 3, height: 20, backgroundColor: "#B22222", borderRadius: 2, flexShrink: 0 }} />
          <h1 className="font-title" style={{ fontSize: "1.6rem", color: "#F5F5F0", lineHeight: 1, letterSpacing: "0.04em", margin: 0 }}>
            CALENDRIER
          </h1>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CalendrierClient userId={userId} initialEvents={events as any} />

      <BottomNav />
    </div>
  );
}
