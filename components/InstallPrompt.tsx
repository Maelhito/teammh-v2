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

  if (showIosBanner) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
        <div
          className="w-full rounded-2xl bg-neutral-900 p-5 shadow-2xl"
          style={{ maxWidth: 420, border: `1px solid ${color}55` }}
        >
          <p className="mb-3 text-base font-bold text-white">
            📲 Installer l&apos;application sur ton écran d&apos;accueil
          </p>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              1
            </span>
            <p className="text-sm text-white">
              Appuie sur l&apos;icône <span className="font-bold">Partager</span>{" "}
              <span aria-hidden>⬆️</span> en bas de l&apos;écran Safari
            </p>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              2
            </span>
            <p className="text-sm text-white">
              Choisis <span className="font-bold">« Sur l&apos;écran d&apos;accueil »</span> puis{" "}
              <span className="font-bold">« Ajouter »</span>
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-4 py-3 shadow-lg">
      <span className="text-sm text-white">Installer l&apos;application sur cet écran d&apos;accueil</span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="px-2 py-1 text-sm text-neutral-400"
        >
          Non
        </button>
        <button
          onClick={handleInstall}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          Installer
        </button>
      </div>
    </div>
  );
}
