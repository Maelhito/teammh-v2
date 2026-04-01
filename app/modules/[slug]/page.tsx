import { notFound, redirect } from "next/navigation";
import { getModuleBySlug, getModules } from "@/lib/modules";
import { getModuleContent } from "@/lib/modules-content";
import { getModuleCompletionsWithDates } from "@/lib/user-profile";
import { computeUnlockStatuses } from "@/lib/module-unlock";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ValidateButton from "./ValidateButton";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getMdxContent(slug: string): string | null {
  const filePath = path.join(process.cwd(), "content", "modules", `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function processInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

interface RenderCtx {
  videos: (string | null | undefined)[];
  pdfUrl?: string | null;
  pdfName?: string | null;
}

function renderMarkdown(content: string, ctx: RenderCtx = { videos: [] }): string {
  const lines = content.split("\n");
  const html: string[] = [];
  let i = 0;
  let videoIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("VIDEO:: ")) {
      const parts = line.slice(8).split(" | ");
      const title = parts[0]?.trim() || "Vidéo";
      let url = (parts[1] || "").trim();

      // Override `#` avec URL Supabase si disponible
      if (url === "#") url = ctx.videos[videoIndex] ?? "#";
      videoIndex++;

      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) url = `https://www.youtube.com/embed/${ytMatch[1]}`;

      if (!url || url === "#") {
        html.push(`<div class="video-block"><p class="video-block-title">${processInline(title)}</p><div class="video-placeholder-box">Vidéo à venir</div></div>`);
      } else {
        html.push(`<div class="video-block"><p class="video-block-title">${processInline(title)}</p><div class="video-wrapper"><iframe src="${url}" frameborder="0" allowfullscreen loading="lazy"></iframe></div></div>`);
      }
      i++; continue;
    }

    if (line.startsWith("PDF:: ")) {
      const parts = line.slice(6).split(" | ");
      const title = parts[0]?.trim() || "Document";
      let filePath = (parts[1] || "").trim();

      // Override `#` avec URL Supabase si disponible
      if (filePath === "#" && ctx.pdfUrl) {
        filePath = ctx.pdfUrl;
      }
      const displayName = filePath !== "#" && ctx.pdfUrl === filePath ? (ctx.pdfName ?? title) : title;

      if (!filePath || filePath === "#") {
        html.push(`<div class="pdf-block pdf-block--placeholder"><span class="pdf-icon">↓</span><span class="pdf-title">${processInline(title)}</span><span class="pdf-badge">PDF à venir</span></div>`);
      } else {
        html.push(`<a href="${filePath}" target="_blank" rel="noopener" class="pdf-block pdf-block--active"><span class="pdf-icon">↓</span><span class="pdf-title">${processInline(displayName)}</span><span class="pdf-badge">Télécharger</span></a>`);
      }
      i++; continue;
    }

    if (line.startsWith(">")) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${bqLines.map((l) => `<p>${processInline(l)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (line.startsWith("# "))  { html.push(`<h1>${processInline(line.slice(2))}</h1>`);  i++; continue; }
    if (line.startsWith("## ")) { html.push(`<h2>${processInline(line.slice(3))}</h2>`);  i++; continue; }
    if (line.startsWith("### ")){ html.push(`<h3>${processInline(line.slice(4))}</h3>`);  i++; continue; }

    if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("• ") || lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(`<li>${processInline(lines[i].replace(/^(• |- |\* )/, ""))}</li>`);
        i++;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (line.trim() === "") { i++; continue; }
    html.push(`<p>${processInline(line)}</p>`);
    i++;
  }

  return html.join("\n");
}

export async function generateStaticParams() {
  return getModules().map((m) => ({ slug: m.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params;
  const moduleData = getModuleBySlug(slug);
  if (!moduleData) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id ?? "";

  const modules = getModules();
  const slugs = modules.map((m) => m.slug);

  const [rawContent, dbContent, completionsWithDates] = await Promise.all([
    Promise.resolve(getMdxContent(slug)),
    getModuleContent(slug),
    userId ? getModuleCompletionsWithDates(userId) : Promise.resolve([]),
  ]);

  // Vérifier si le module est accessible
  const unlockStatuses = computeUnlockStatuses(slugs, completionsWithDates);
  const slugIndex = slugs.indexOf(slug);
  const unlockStatus = unlockStatuses[slugIndex];

  if (unlockStatus && !unlockStatus.unlocked) {
    redirect("/dashboard?locked=1");
  }

  const isCompleted = completionsWithDates.some((c) => c.module_slug === slug);

  const ctx: RenderCtx = {
    videos: [dbContent?.video_url_1, dbContent?.video_url_2, dbContent?.video_url_3],
    pdfUrl: dbContent?.pdf_url,
    pdfName: dbContent?.pdf_name,
  };

  const htmlContent = rawContent ? renderMarkdown(rawContent, ctx) : "";

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      <AppHeader back backHref="/dashboard" />

      {/* Bannière */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            background: "linear-gradient(160deg, #8B0000 0%, #B22222 100%)",
            padding: "24px 20px 28px",
            borderRadius: 20,
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
            {moduleData.category}{moduleData.duration ? ` · ${moduleData.duration}` : ""}
          </p>
          <h1 className="font-title" style={{ fontSize: "1.7rem", color: "#FFFFFF", lineHeight: 1, letterSpacing: "0.02em" }}>
            {moduleData.title.toUpperCase()}
          </h1>
          <p className="font-body" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
            {moduleData.description}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px 0" }}>
        <div style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 18, padding: "20px 20px 24px" }}>
          <article className="prose-module" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
        <ValidateButton slug={slug} initialCompleted={isCompleted} />
      </div>

      <BottomNav />
    </div>
  );
}
