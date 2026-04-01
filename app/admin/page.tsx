import Link from "next/link";
import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getModules } from "@/lib/modules";
import { getAllModulesContent } from "@/lib/modules-content";
import InviteForm from "./InviteForm";
import ClientsTable from "./ClientsTable";
import ModuleManager, { type ModuleWithVideos } from "./ModuleManager";
import SendNotificationForm from "./SendNotificationForm";

export const dynamic = "force-dynamic";

function parseVideoLabels(slug: string): string[] {
  const filePath = path.join(process.cwd(), "content", "modules", `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  return lines
    .filter((l) => l.startsWith("VIDEO:: ") && l.endsWith("| #"))
    .map((l) => l.slice(8).split(" | ")[0]?.trim() ?? "Vidéo");
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const modules = getModules();
  const modulesContent = await getAllModulesContent();

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

      <ClientsTable />

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
