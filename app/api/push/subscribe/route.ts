import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await request.json();

  // Accepte soit { subscription, timezone } soit la subscription directement (legacy)
  const subscription = body?.endpoint ? body : body?.subscription;
  const timezone: string = body?.timezone ?? "Europe/Paris";

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Subscription invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Upsert : si même endpoint existe déjà → mettre à jour le timezone
  const { data: existing } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("subscription->>endpoint", subscription.endpoint)
    .single();

  if (existing) {
    await admin
      .from("push_subscriptions")
      .update({ timezone })
      .eq("id", existing.id);
  } else {
    await admin.from("push_subscriptions").insert({
      user_id: user.id,
      subscription,
      timezone,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  await admin.from("push_subscriptions").delete().eq("user_id", user.id);
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ subscribed: false });

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  return NextResponse.json({ subscribed: !!(data && data.length > 0) });
}
