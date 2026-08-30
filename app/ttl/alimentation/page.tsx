import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getRecettes } from "@/lib/ttl";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtlAlimentation from "./TtlAlimentation";

export const dynamic = "force-dynamic";

export default async function TtlAlimentationPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtlAccess(userId, isPreview);

  const recettes = await getRecettes();

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Alimentation" subtitle="Tes recettes, repas par repas" />

        <TtlAlimentation recettes={recettes} />
      </div>

      <TtlBottomNav />
    </div>
  );
}
