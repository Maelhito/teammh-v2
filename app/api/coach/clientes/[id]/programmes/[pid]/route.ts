import { NextRequest, NextResponse } from "next/server";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type Params = { params: Promise<{ id: string; pid: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { pid } = await params;

  const body = await req.json();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("client_programmes")
    .update(body)
    .eq("id", pid)
    .select("*, programme:programmes(id, nom, niveau, duree_semaines, description)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await checkCoachAccess();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { pid } = await params;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("client_programmes").delete().eq("id", pid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
