import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { getModules } from "@/lib/modules";

// Vérifie et notifie les modules 4–7 qui viennent de se débloquer (48h après validation du précédent)
// Ce cron tourne toutes les heures via Vercel Crons

export async function GET(request: NextRequest) {
  // Vercel envoie l'header Authorization en production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const modules = getModules();
  // modules 3-6 (index 2-5) déclenchent le déblocage des modules 4-7 (index 3-6)
  const timeGatedPairs = [
    { prevSlug: modules[2].slug, nextSlug: modules[3].slug, nextTitle: modules[3].title },
    { prevSlug: modules[3].slug, nextSlug: modules[4].slug, nextTitle: modules[4].title },
    { prevSlug: modules[4].slug, nextSlug: modules[5].slug, nextTitle: modules[5].title },
    { prevSlug: modules[5].slug, nextSlug: modules[6].slug, nextTitle: modules[6].title },
  ];

  const admin = createSupabaseAdminClient();
  let notifSent = 0;

  for (const pair of timeGatedPairs) {
    // Cherche les validations du module précédent qui ont eu lieu entre 48h et 49h
    // → le module suivant vient tout juste de se débloquer cette dernière heure
    const { data: completions } = await admin
      .from("module_completions")
      .select("user_id, completed_at")
      .eq("module_slug", pair.prevSlug)
      .gte("completed_at", new Date(Date.now() - 49 * 3600 * 1000).toISOString())
      .lte("completed_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString());

    if (!completions?.length) continue;

    for (const completion of completions) {
      await sendPushToUser(completion.user_id, {
        title: "🔓 Module disponible !",
        body: `Ton module "${pair.nextTitle}" est maintenant accessible.`,
        url: `/modules/${pair.nextSlug}`,
      });
      notifSent++;
    }
  }

  return NextResponse.json({ success: true, notifSent });
}
