import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";
import type { ClientData } from "@/app/admin/ClientsTable";
import fs from "fs";
import path from "path";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

export function parseVideoLabels(slug: string): string[] {
  const filePath = path.join(process.cwd(), "content", "modules", `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  return lines
    .filter((l) => l.startsWith("VIDEO:: ") && l.endsWith("| #"))
    .map((l) => l.slice(8).split(" | ")[0]?.trim() ?? "Vidéo");
}

export async function fetchClients(): Promise<{ clients: ClientData[]; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { clients: [], error: "SUPABASE_SERVICE_ROLE_KEY manquante." };

  let authUsers: { id: string; email?: string; created_at: string }[] = [];
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=500`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
    });
    if (!res.ok) return { clients: [], error: `Auth API error ${res.status}` };
    const json = await res.json();
    authUsers = json.users ?? json ?? [];
  } catch (err) {
    return { clients: [], error: String(err) };
  }

  const clients = authUsers.filter((u) => u.email !== ADMIN_EMAIL);
  if (!clients.length) return { clients: [], error: null };

  const clientIds = clients.map((u) => u.id);
  const totalModules = getModules().length;
  const admin = createSupabaseAdminClient();

  const [{ data: profiles }, { data: completions }] = await Promise.all([
    admin.from("user_profiles")
      .select("user_id, prenom, nom, statut, date_demarrage, acces_app, programme_type, programme_duree, coach_id, nutrition_id")
      .in("user_id", clientIds),
    admin.from("module_completions").select("user_id").in("user_id", clientIds),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));
  const completionCount: Record<string, number> = {};
  for (const c of completions ?? []) {
    completionCount[c.user_id] = (completionCount[c.user_id] ?? 0) + 1;
  }

  return {
    clients: clients.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      prenom: profileMap[u.id]?.prenom ?? null,
      nom: profileMap[u.id]?.nom ?? null,
      statut: (profileMap[u.id]?.statut ?? "active") as "active" | "pause" | "terminee",
      date_demarrage: profileMap[u.id]?.date_demarrage ?? null,
      completedCount: completionCount[u.id] ?? 0,
      totalModules,
      acces_app: profileMap[u.id]?.acces_app ?? true,
      programme_type: (profileMap[u.id]?.programme_type ?? "N1") as "N1" | "N2",
      programme_duree: (profileMap[u.id]?.programme_duree ?? "16_semaines") as "16_semaines" | "6_mois" | "12_mois",
      coach_id: profileMap[u.id]?.coach_id ?? null,
      nutrition_id: profileMap[u.id]?.nutrition_id ?? null,
    })),
    error: null,
  };
}
