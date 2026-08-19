import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkCoachAccess } from "@/lib/check-coach-access";
import { clienteRevoquee } from "@/lib/acces-app";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const coach = await checkCoachAccess();
  if (!coach) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  if (await clienteRevoquee(id)) return NextResponse.json({ error: "Accès révoqué" }, { status: 403 });
  const cookieStore = await cookies();
  cookieStore.set("preview_user_id", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4h
  });

  return NextResponse.json({ success: true });
}
