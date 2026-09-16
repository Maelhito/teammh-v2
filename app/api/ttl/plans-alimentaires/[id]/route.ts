import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getOffreCliente } from "@/lib/ttl";

/**
 * Les pages d'un plan alimentaire, chargées à l'ouverture du plan.
 * Le PDF d'origine n'est jamais renvoyé : la cliente consulte, elle ne télécharge pas.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (user.user_metadata?.role as string | undefined) ?? "cliente";
  if (role === "cliente") {
    const offre = await getOffreCliente(user.id);
    if (offre?.offre !== "TTL") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_plans_alimentaires")
    .select("pages, miniatures")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });

  return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
}
