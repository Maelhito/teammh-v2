import { getModules } from "@/lib/modules";
import { getAllModulesContent } from "@/lib/modules-content";
import { parseVideoLabels } from "@/lib/admin/fetchClients";
import ModuleManager from "../ModuleManager";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const modules = getModules();
  const modulesContent = await getAllModulesContent();

  const modulesWithVideos = modules.map((m) => ({
    ...m,
    videoLabels: parseVideoLabels(m.slug),
  }));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
          Contenu
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#F5F5F0", margin: 0, fontFamily: "system-ui" }}>
          📚 Modules
        </h1>
      </div>
      <ModuleManager modules={modulesWithVideos} initialContent={modulesContent} />
    </div>
  );
}
