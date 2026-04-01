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

async function fetchClients(): Promise<ClientData[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 500 });
    if (error || !users) return [];

    const clients = users.filter((u) => u.email !== ADMIN_EMAIL);
    if (!clients.length) return [];

    const clientIds = clients.map((u) => u.id);
    const totalModules = getModules().length;

    const [{ data: profiles }, { data: completions }] = await Promise.all([
      admin.from("user_profiles").select("user_id, prenom, nom, statut, date_demarrage").in("user_id", clientIds),
      admin.from("module_completions").select("user_id").in("user_id", clientIds),
    ]);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));
    const completionCount: Record<string, number> = {};
    for (const c of completions ?? []) {
      completionCount[c.user_id] = (completionCount[c.user_id] ?? 0) + 1;
    }

    return clients.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      prenom: profileMap[u.id]?.prenom ?? null,
      nom: profileMap[u.id]?.nom ?? null,
      statut: (profileMap[u.id]?.statut ?? "active") as "active" | "pause" | "terminee",
      date_demarrage: profileMap[u.id]?.date_demarrage ?? null,
      completedCount: completionCount[u.id] ?? 0,
      totalModules,
    }));
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const modules = getModules();
  const [modulesContent, clients] = await Promise.all([
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

      <ClientsTable initialClients={clients} />

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
