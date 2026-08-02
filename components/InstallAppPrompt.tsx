"use client";

import { useEffect, useState } from "react";

interface Props {
  app: "ttm" | "tts";
}

type Platform = "ios-safari" | "ios-other" | "android" | "desktop";

const THEME = {
  ttm: { accent: "#B22222", accentDark: "#7A1515", name: "Time To Move", home: "/dashboard" },
  tts: { accent: "#22C55E", accentDark: "#16803C", name: "Time To Start", home: "/tts" },
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppPrompt({ app }: Props) {
  const theme = THEME[app];
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isInApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger/i.test(ua);
    const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) && !isInApp;
    const isAndroid = /Android/.test(ua);

    if (isIOS && isIOSSafari) setPlatform("ios-safari");
    else if (isIOS) setPlatform("ios-other");
    else if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    setMounted(true);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!mounted || isStandalone) return null;
  if (platform === "desktop" && !deferredPrompt) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowGuide(true);
  }

  async function copyLink() {
    const url = window.location.origin + theme.home;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore, on affiche quand même le lien à l'écran
    }
    setCopied(true);
  }

  return (
    <>
      <div style={{ margin: "12px 16px 0" }}>
        <button
          onClick={handleClick}
          className="font-body"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentDark} 100%)`,
            border: "none",
            borderRadius: 14,
            padding: "13px 16px",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>📲</span>
          Installer l&apos;app {theme.name} sur mon téléphone
        </button>
      </div>

      {showGuide && (
        <InstallGuideOverlay
          app={app}
          platform={platform === "desktop" ? "android" : platform}
          copied={copied}
          onCopyLink={copyLink}
          onClose={() => {
            setShowGuide(false);
            setCopied(false);
          }}
        />
      )}
    </>
  );
}

function InstallGuideOverlay({
  app,
  platform,
  copied,
  onCopyLink,
  onClose,
}: {
  app: "ttm" | "tts";
  platform: Exclude<Platform, "desktop">;
  copied: boolean;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  const theme = THEME[app];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.94)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <style>{`
        @keyframes installGuideBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }
      `}</style>

      <div style={{ maxWidth: 420, margin: "0 auto", width: "100%", padding: "24px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="font-body"
          style={{
            alignSelf: "flex-end",
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <p className="font-body" style={{ color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "12px 0 6px" }}>
          Installer {theme.name}
        </p>
        <p className="font-body" style={{ color: "#8A8078", fontSize: 13, textAlign: "center", margin: "0 0 28px" }}>
          {platform === "ios-other" ? "L'installation se fait depuis Safari" : "Suis les 2 étapes ci-dessous"}
        </p>

        {platform === "ios-safari" && (
          <>
            <GuideStep number={1} icon="📤" color={theme.accent} text={<>Appuie sur le bouton <b>Partager</b>, en bas de l&apos;écran</>} />
            <GuideStep number={2} icon="➕" color={theme.accent} text={<>Fais défiler puis appuie sur <b>« Sur l&apos;écran d&apos;accueil »</b></>} />
            <GuideStep number={3} icon="✅" color={theme.accent} text={<>Appuie sur <b>« Ajouter »</b> en haut à droite. C&apos;est fait !</>} />
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: 24, paddingBottom: 8 }}>
              <div style={{ textAlign: "center", animation: "installGuideBounce 1.4s ease-in-out infinite" }}>
                <span style={{ fontSize: 30 }}>⬇️</span>
                <p className="font-body" style={{ color: "#fff", fontSize: 12, fontWeight: 600, margin: "2px 0 0" }}>
                  Le bouton Partager 📤 est ici, en bas de Safari
                </p>
              </div>
            </div>
          </>
        )}

        {platform === "ios-other" && (
          <>
            <p className="font-body" style={{ color: "#fff", fontSize: 14, lineHeight: 1.6, textAlign: "center", margin: "0 0 20px" }}>
              Ce navigateur ne permet pas d&apos;installer l&apos;app.<br />
              Copie le lien puis colle-le dans <b>Safari</b> pour installer {theme.name}.
            </p>
            <button
              onClick={onCopyLink}
              className="font-body"
              style={{
                background: theme.accent,
                border: "none",
                borderRadius: 12,
                padding: "13px 16px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copied ? "✅ Lien copié !" : "🔗 Copier le lien"}
            </button>
            {copied && (
              <p className="font-body" style={{ color: "#8A8078", fontSize: 12.5, textAlign: "center", margin: "10px 0 0" }}>
                Ouvre l&apos;app Safari, colle le lien dans la barre d&apos;adresse, puis suis le guide.
              </p>
            )}
          </>
        )}

        {platform === "android" && (
          <>
            <GuideStep number={1} icon="⋮" color={theme.accent} text={<>Appuie sur les <b>3 points</b>, en haut à droite du navigateur</>} />
            <GuideStep number={2} icon="⬇️" color={theme.accent} text={<>Appuie sur <b>« Installer l&apos;application »</b> (ou « Ajouter à l&apos;écran d&apos;accueil »)</>} />
          </>
        )}
      </div>
    </div>
  );
}

function GuideStep({ number, icon, color, text }: { number: number; icon: string; color: string; text: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          position: "relative",
        }}
      >
        {icon}
        <span
          className="font-body"
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#fff",
            color: "#0D0D0D",
            fontSize: 11,
            fontWeight: 800,
            width: 18,
            height: 18,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {number}
        </span>
      </div>
      <p className="font-body" style={{ color: "#fff", fontSize: 14.5, lineHeight: 1.4, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}
