"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptProps {
  color?: string;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt({ color = "#B22222" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    if (isIos()) {
      setShowIosBanner(true);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (dismissed || (!deferredPrompt && !showIosBanner)) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-4 py-3 shadow-lg">
      <span className="text-sm text-white">
        {showIosBanner
          ? "Installer l'app : appuyez sur Partager puis \"Sur l'écran d'accueil\""
          : "Installer l'application sur cet écran d'accueil"}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="px-2 py-1 text-sm text-neutral-400"
        >
          {showIosBanner ? "OK" : "Non"}
        </button>
        {!showIosBanner && (
          <button
            onClick={handleInstall}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            Installer
          </button>
        )}
      </div>
    </div>
  );
}
