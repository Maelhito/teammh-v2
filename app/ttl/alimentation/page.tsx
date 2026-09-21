import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getEffectiveUser } from "@/lib/preview";
import { requireTtlAccess } from "@/lib/ttl-access";
import { getPlansAlimentaires, getRecettes } from "@/lib/ttl";
import TtlHeader from "@/components/TtlHeader";
import TtlBottomNav from "@/components/TtlBottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import TtlAlimentation from "./TtlAlimentation";

export const dynamic = "force-dynamic";

export default async function TtlAlimentationPage({ searchParams }: { searchParams: Promise<{ recette?: string }> }) {
  const { recette } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  await requireTtlAccess(userId, isPreview);

  const [plans, recettes] = await Promise.all([getPlansAlimentaires(), getRecettes()]);

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 100 }}>
      {isPreview && <PreviewBanner name={firstName} />}

      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <TtlHeader variant="page" title="Alimentation" subtitle="Tes plans alimentaires, tes recettes et tes équivalences" />

        <TtlAlimentation plans={plans} recettes={recettes} recetteInitiale={recette} />
      </div>

      <TtlBottomNav />
    </div>
  );
}
