import { isAdminUser } from "@/lib/is-admin";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { trouverFichiersOrphelins } from "@/lib/ttl-stockage";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user) ? user : null;
}

/** Combien de fichiers inutiles, et quelle place ils prennent. */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const orphelins = await trouverFichiersOrphelins();
    return NextResponse.json({ nombre: orphelins.length, octets: orphelins.reduce((s, f) => s + f.taille, 0) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}

/** Supprime les fichiers inutiles, recalculés au moment du clic. */
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const orphelins = await trouverFichiersOrphelins();
    const admin = createSupabaseAdminClient();
    for (const bucket of ["ttl-images", "ttl-docs"] as const) {
      const chemins = orphelins.filter((f) => f.bucket === bucket).map((f) => f.chemin);
      for (let i = 0; i < chemins.length; i += 500) {
        const { error } = await admin.storage.from(bucket).remove(chemins.slice(i, i + 500));
        if (error) throw new Error(error.message);
      }
    }
    return NextResponse.json({ nombre: orphelins.length, octets: orphelins.reduce((s, f) => s + f.taille, 0) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
