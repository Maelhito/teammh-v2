import { isAdminUser } from "@/lib/is-admin";
import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendPushToAllTtl } from "@/lib/push";
import { TTL_PLAN_CALORIES } from "@/lib/ttl";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_plans_alimentaires")
    .select("id, calories, pdf_url, pages")
    .order("calories", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plans: data ?? [] });
}

/** Crée ou remplace le plan d'un apport calorique. */
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { calories, pdf_url, pages, notifier } = await request.json();
  if (!(TTL_PLAN_CALORIES as readonly number[]).includes(Number(calories))) {
    return NextResponse.json({ error: "Apport calorique invalide" }, { status: 400 });
  }
  if (!pdf_url || !Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ error: "PDF et pages requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ttl_plans_alimentaires")
    .upsert(
      {
        calories: Number(calories),
        pdf_url: String(pdf_url).slice(0, 500),
        pages: pages.slice(0, 100).map((p: unknown) => String(p).slice(0, 500)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "calories" },
    )
    .select("id, calories, pdf_url, pages")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (notifier) {
    after(() => sendPushToAllTtl({
      title: "🥗 Plan alimentaire disponible",
      body: `Le plan ${data.calories} kcal est disponible dans ton onglet Alimentation.`,
      url: "/ttl/alimentation",
    }));
  }

  return NextResponse.json({ plan: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("ttl_plans_alimentaires").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
