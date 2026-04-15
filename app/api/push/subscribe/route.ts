import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const subscription = await request.json();

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Subscription invalide" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Évite les doublons sur le même endpoint
  const { data: existing } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("subscription->>endpoint", subscription.endpoint)
    .single();

  if (!existing) {
    await admin.from("push_subscriptions").insert({
      user_id: user.id,
      subscription,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  await admin.from("push_subscriptions").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ subscribed: false });
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  return NextResponse.json({ subscribed: !!(data && data.length > 0) });
}
