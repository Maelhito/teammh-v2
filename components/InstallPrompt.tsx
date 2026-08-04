"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptProps {
  color?: string;
}

const ANDROID_FALLBACK_DELAY_MS = 2500;

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function ManualStepsBanner({
  color,
  title,
  step1,
  step2,
  onDismiss,
}: {
  color: string;
  title: string;
  step1: React.ReactNode;
  step2: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="w-full rounded-2xl bg-neutral-900 p-5 shadow-2xl"
        style={{ maxWidth: 420, border: `1px solid ${color}55` }}
      >
        <p className="mb-3 text-base font-bold text-white">{title}</p>
        <div className="flex items-center gap-3 mb-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            1
          </span>
          <p className="text-sm text-white">{step1}</p>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            2
          </span>
          <p className="text-sm text-white">{step2}</p>
        </div>
        <button
          onClick={onDismiss}
          className="w-full rounded-full py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          J&apos;ai compris
        </button>
      </div>
    </div>
  );
}

export default function InstallPrompt({ color = "#B22222" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [showAndroidFallback, setShowAndroidFallback] = useState(false);
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

    let gotNativePrompt = false;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      gotNativePrompt = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidFallback(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Certains navigateurs Android (Mi Browser/MIUI, anciens Samsung Internet, etc.)
    // ne déclenchent jamais beforeinstallprompt : on affiche des instructions
    // manuelles si l'événement natif n'arrive pas après un court délai.
    const fallbackTimer = window.setTimeout(() => {
      if (!gotNativePrompt) setShowAndroidFallback(true);
    }, ANDROID_FALLBACK_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  if (dismissed || (!deferredPrompt && !showIosBanner && !showAndroidFallback)) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (showIosBanner) {
    return (
      <ManualStepsBanner
        color={color}
        title="📲 Installer l'application sur ton écran d'accueil"
        step1={
          <>
            Appuie sur l&apos;icône <span className="font-bold">Partager</span>{" "}
            <span aria-hidden>⬆️</span> en bas de l&apos;écran Safari
          </>
        }
        step2={
          <>
            Choisis <span className="font-bold">« Sur l&apos;écran d&apos;accueil »</span> puis{" "}
            <span className="font-bold">« Ajouter »</span>
          </>
        }
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  if (showAndroidFallback && !deferredPrompt) {
    return (
      <ManualStepsBanner
        color={color}
        title="📲 Installer l'application sur ton écran d'accueil"
        step1={
          <>
            Appuie sur le menu <span className="font-bold">⋮</span> (3 points) en haut à droite
            de ton navigateur
          </>
        }
        step2={
          <>
            Choisis <span className="font-bold">« Ajouter à l&apos;écran d&apos;accueil »</span>,{" "}
            <span className="font-bold">« Ajouter au bureau »</span>,{" "}
            <span className="font-bold">« Créer un raccourci »</span> ou{" "}
            <span className="font-bold">« Installer l&apos;application »</span> (le libellé change
            selon le navigateur)
          </>
        }
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="w-full rounded-2xl bg-neutral-900 p-5 shadow-2xl"
        style={{ maxWidth: 420, border: `1px solid ${color}55` }}
      >
        <p className="mb-4 text-base font-bold text-white">
          Installer l&apos;application sur ton écran d&apos;accueil
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-2 text-sm text-neutral-400"
          >
            Non
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
