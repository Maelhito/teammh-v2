import Link from "next/link";
import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getModules } from "@/lib/modules";
import { getAllModulesContent } from "@/lib/modules-content";
import InviteForm from "./InviteForm";
import ClientsTable, { type ClientData } from "./ClientsTable";
import ModuleManager, { type ModuleWithVideos } from "./ModuleManager";
import SendNotificationForm from "./SendNotificationForm";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "mael.ld@hotmail.fr";

function parseVideoLabels(slug: string): string[] {
  const filePath = path.join(process.cwd(), "content", "modules", `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  return lines
    .filter((l) => l.startsWith("VIDEO:: ") && l.endsWith("| #"))
    .map((l) => l.slice(8).split(" | ")[0]?.trim() ?? "Vidéo");
}

interface FetchResult {
  clients: ClientData[];
  error: string | null;
}

async function fetchClients(): Promise<FetchResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Diagnostic : variable d'env manquante
  if (!serviceKey) {
    console.error("[admin] SUPABASE_SERVICE_ROLE_KEY manquante dans les variables d'environnement Vercel");
    return { clients: [], error: "SUPABASE_SERVICE_ROLE_KEY non configurée. Ajoute-la dans les variables d'environnement Vercel." };
  }

  // Fetch REST direct vers l'API Auth Supabase (évite auth.admin.listUsers)
  let authUsers: { id: string; email?: string; created_at: string }[] = [];
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=500`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[admin] Auth API error:", res.status, body);
      return { clients: [], error: `Erreur API Auth (${res.status}): ${body.slice(0, 120)}` };
    }

    const json = await res.json();
    // Supabase retourne { users: [...] } ou directement un tableau selon la version
    authUsers = json.users ?? json ?? [];
  } catch (err) {
    console.error("[admin] Fetch auth users exception:", err);
    return { clients: [], error: `Exception lors du fetch des utilisateurs: ${String(err)}` };
  }

  const clients = authUsers.filter((u) => u.email !== ADMIN_EMAIL);
  if (!clients.length) return { clients: [], error: null };

  const clientIds = clients.map((u) => u.id);
  const totalModules = getModules().length;

  try {
    const admin = createSupabaseAdminClient();
    const [{ data: profiles, error: profilesError }, { data: completions }] = await Promise.all([
      admin.from("user_profiles").select("user_id, prenom, nom, statut, date_demarrage, acces_app").in("user_id", clientIds),
      admin.from("module_completions").select("user_id").in("user_id", clientIds),
    ]);

    if (profilesError) {
      console.error("[admin] user_profiles query error:", profilesError.message);
      // On continue sans profils — au moins les emails s'affichent
    }

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
      })),
      error: null,
    };
  } catch (err) {
    console.error("[admin] DB query exception:", err);
    return { clients: [], error: `Erreur base de données: ${String(err)}` };
  }
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const modules = getModules();
  const [modulesContent, { clients, error: clientsError }] = await Promise.all([
    getAllModulesContent(),
    fetchClients(),
  ]);

  const modulesWithVideos: ModuleWithVideos[] = modules.map((m) => ({
    ...m,
    videoLabels: parseVideoLabels(m.slug),
  }));

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", color: "#FFFFFF", padding: 24, paddingBottom: 60 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.05em" }}>
        ESPACE ADMIN
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
        {session?.user.email}
      </p>

      <InviteForm />

      <div style={{ marginTop: 32, padding: "10px 14px", backgroundColor: "#1a0a0a", border: "1px solid #B22222", borderRadius: 8, fontSize: 12, color: "#F87171" }}>
        🔴 DEBUG — {clients.length} cliente(s) | erreur: {clientsError ?? "aucune"} | v2
      </div>

      <ClientsTable initialClients={clients} fetchError={clientsError} />

      <ModuleManager modules={modulesWithVideos} initialContent={modulesContent} />

      <SendNotificationForm />

      <Link
        href="/dashboard?preview=1"
        style={{
          display: "inline-block",
          marginTop: 40,
          padding: "10px 20px",
          backgroundColor: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8,
          color: "rgba(255,255,255,0.5)",
          fontSize: 13,
          textDecoration: "none",
          letterSpacing: "0.04em",
        }}
      >
        Voir l&apos;espace cliente →
      </Link>
    </div>
  );
}
