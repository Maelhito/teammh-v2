import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserProfile } from "@/lib/user-profile";
import { getOnboardingModules, getSportVideos, getRecettes, getClienteOffre } from "@/lib/tts-client";
import { TtsHeader, SectionTitle, SimpleCard } from "./TtsShared";

export const dynamic = "force-dynamic";

export default async function TtsHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user!.id;

  const [profile, offre, modules, sportVideos, recettes] = await Promise.all([
    getUserProfile(userId),
    getClienteOffre(userId),
    getOnboardingModules(userId),
    getSportVideos(),
    getRecettes(),
  ]);

  const totalVideos = modules.reduce((acc, m) => acc + m.videos.length, 0);
  const watchedVideos = modules.reduce((acc, m) => acc + m.videos.filter((v) => v.watched).length, 0);
  const progressPct = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;
  const currentModule = modules.find((m) => m.unlocked && !m.completed) ?? modules[modules.length - 1];
  const currentIndex = currentModule ? modules.findIndex((m) => m.id === currentModule.id) + 1 : 0;

  const prenom = profile?.prenom ?? "";
  const offreLabel = offre === "TTL" ? "TIME TO LAST" : "TIME TO START";

  return (
    <div>
      <TtsHeader prenom={prenom} avatarUrl={profile?.avatar_url ?? null} offreLabel={offreLabel} />

      <div style={{ padding: "20px 20px 0" }}>
        {modules.length > 0 && currentModule && !currentModule.completed && (
          <div style={{
            backgroundColor: "#1A1414", border: "1px solid #2A2020", borderRadius: 18, padding: 18, marginBottom: 6,
            backgroundImage: "radial-gradient(circle at top right, rgba(178,34,34,0.25), transparent 60%)",
          }}>
            <p className="font-body" style={{ color: "#E63946", fontSize: 11, fontWeight: 700, letterSpacing: "1px", margin: 0 }}>MON PARCOURS</p>
            <h3 className="font-title" style={{ color: "#fff", fontSize: 18, margin: "6px 0 4px", letterSpacing: "0.5px" }}>
              Continue ton onboarding
            </h3>
            <p className="font-body" style={{ color: "#8A8078", fontSize: 12.5, margin: "0 0 12px", lineHeight: 1.4 }}>
              Module {currentIndex} sur {modules.length} — {currentModule.titre}
            </p>
            <div style={{ height: 6, background: "#2A2020", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#B22222,#E63946)" }} />
            </div>
            <div className="font-body" style={{ color: "#8A8078", fontSize: 11, display: "flex", justifyContent: "space-between" }}>
              <span>{watchedVideos}/{totalVideos} vidéos</span>
              <span>{progressPct}%</span>
            </div>
            <Link href="/tts-app/parcours" style={{ display: "block", marginTop: 12, textAlign: "center", padding: "9px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Continuer →
            </Link>
          </div>
        )}

        <SectionTitle count={`${sportVideos.length} dispo`}>Reprends une séance</SectionTitle>
        {sportVideos.slice(0, 2).map((v) => (
          <Link key={v.id} href="/tts-app/bibliotheque" style={{ textDecoration: "none" }}>
            <SimpleCard icon="🏋️" title={v.titre} subtitle={`Mois ${v.numero_mois}${v.materiel?.length ? " · " + v.materiel.join(", ") : ""}`} />
          </Link>
        ))}
        {sportVideos.length === 0 && <p className="font-body" style={{ color: "#555", fontSize: 12, fontStyle: "italic" }}>Aucune séance disponible pour l&apos;instant.</p>}

        <SectionTitle count={`${recettes.length} dispo`}>Recette du jour</SectionTitle>
        {recettes.slice(0, 1).map((r) => (
          <Link key={r.id} href="/tts-app/bibliotheque" style={{ textDecoration: "none" }}>
            <SimpleCard icon="🥗" title={r.titre} subtitle="Recette" />
          </Link>
        ))}
        {recettes.length === 0 && <p className="font-body" style={{ color: "#555", fontSize: 12, fontStyle: "italic" }}>Aucune recette disponible pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
