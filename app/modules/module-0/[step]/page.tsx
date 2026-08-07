import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getModuleContent } from "@/lib/modules-content";
import { getModuleCompletionsWithDates } from "@/lib/user-profile";
import { getModule0Step, stepCompletionSlug, MODULE_0_STEPS } from "@/lib/module-0-steps";
import { getEffectiveUser } from "@/lib/preview";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PreviewBanner from "@/components/PreviewBanner";
import ValidateButton from "../../[slug]/ValidateButton";
import QuestionnaireDemarrage from "./QuestionnaireDemarrage";

export const dynamic = "force-dynamic";

/** Normalise une URL YouTube (watch, youtu.be, shorts, live) vers /embed/ */
function toEmbedUrl(url: string): string {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (m && !url.includes("/embed/")) return `https://www.youtube.com/embed/${m[1]}`;
  return url;
}

export function generateStaticParams() {
  return MODULE_0_STEPS.map((s) => ({ step: s.key }));
}

interface PageProps {
  params: Promise<{ step: string }>;
}

export default async function Module0StepPage({ params }: PageProps) {
  const { step: stepKey } = await params;
  const step = getModule0Step(stepKey);
  if (!step) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { userId, firstName, isPreview } = await getEffectiveUser(session);

  const completionSlug = stepCompletionSlug(step.key);

  const [dbContent, completions] = await Promise.all([
    getModuleContent(completionSlug),
    userId ? getModuleCompletionsWithDates(userId) : Promise.resolve([]),
  ]);

  const isCompleted = completions.some((c) => c.module_slug === completionSlug);

  // Vidéos configurées en admin pour cette étape
  const videos = [
    [dbContent?.video_url_1, dbContent?.video_title_1],
    [dbContent?.video_url_2, dbContent?.video_title_2],
    [dbContent?.video_url_3, dbContent?.video_title_3],
    [dbContent?.video_url_4, dbContent?.video_title_4],
    [dbContent?.video_url_5, dbContent?.video_title_5],
    [dbContent?.video_url_6, dbContent?.video_title_6],
    [dbContent?.video_url_7, dbContent?.video_title_7],
    [dbContent?.video_url_8, dbContent?.video_title_8],
    [dbContent?.video_url_9, dbContent?.video_title_9],
    [dbContent?.video_url_10, dbContent?.video_title_10],
  ].filter(([url]) => !!url) as [string, string | null][];

  // Lien externe (questionnaire) — réutilise le champ lien externe éditable en admin
  const lienExterne = dbContent?.lien_canva_equivalences ?? null;

  return (
    <div style={{ backgroundColor: "#0D0D0D", minHeight: "100vh", paddingBottom: 90 }}>
      {isPreview && <PreviewBanner name={firstName} />}
      <AppHeader back backHref="/modules/module-0" />

      {/* Bannière */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            background: "linear-gradient(160deg, #7C2D12 0%, #B45309 100%)",
            padding: "24px 20px 28px",
            borderRadius: 20,
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <p className="font-body" style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
            Démarrage · Point {step.index}/{MODULE_0_STEPS.length}
          </p>
          <h1 className="font-title" style={{ fontSize: "1.6rem", color: "#FFFFFF", lineHeight: 1.05, letterSpacing: "0.02em" }}>
            {step.title.toUpperCase()}
          </h1>
          <p className="font-body" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
            {step.description}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px 0" }}>
        {/* Vidéos */}
        {videos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {videos.map(([url, title], i) => (
              <div key={i} style={{ backgroundColor: "#111111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 14 }}>
                <p className="font-body" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F5F5F0", margin: "0 0 10px" }}>
                  {title || `Vidéo ${i + 1}`}
                </p>
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden" }}>
                  <iframe
                    src={toEmbedUrl(url)}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lien externe (questionnaire alimentaire) */}
        {step.type === "external" && (
          lienExterne ? (
            <a
              href={lienExterne}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginTop: videos.length ? 14 : 0,
                padding: "16px 20px",
                backgroundColor: "#111111",
                border: "1px solid #F59E0B",
                borderRadius: 14,
                color: "#F59E0B",
                fontSize: "0.92rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.03em",
              }}
            >
              📝 Remplir le questionnaire →
            </a>
          ) : (
            <div
              style={{
                marginTop: videos.length ? 14 : 0,
                padding: "16px 20px",
                backgroundColor: "#111111",
                border: "1px dashed #333",
                borderRadius: 14,
                color: "#6B7280",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              Le lien du questionnaire sera ajouté prochainement.
            </div>
          )
        )}

        {/* Questionnaire de démarrage */}
        {step.hasQuestionnaire && (
          <div style={{ marginTop: videos.length ? 14 : 0 }}>
            <QuestionnaireDemarrage />
          </div>
        )}

        {/* Aucun contenu encore configuré */}
        {videos.length === 0 && step.type === "content" && !step.hasQuestionnaire && (
          <div
            style={{
              padding: "20px",
              backgroundColor: "#111111",
              border: "1px dashed #333",
              borderRadius: 16,
              color: "#6B7280",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            Le contenu de ce point arrive bientôt.
          </div>
        )}

        <ValidateButton slug={completionSlug} initialCompleted={isCompleted} />
      </div>

      <BottomNav />
    </div>
  );
}
