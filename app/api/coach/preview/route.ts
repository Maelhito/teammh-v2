import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("preview_user_id");
  return NextResponse.json({ success: true });
}
