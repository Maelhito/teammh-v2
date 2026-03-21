import fs from "fs";
import path from "path";

export interface Module {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
  duration?: string;
  type: "video" | "document" | "mixed";
  emoji?: string;
}

export function getModules(): Module[] {
  const filePath = path.join(process.cwd(), "content", "modules", "index.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as { modules: Module[] };
  return data.modules.sort((a, b) => a.order - b.order);
}

export function getModuleBySlug(slug: string): Module | undefined {
  return getModules().find((m) => m.slug === slug);
}
