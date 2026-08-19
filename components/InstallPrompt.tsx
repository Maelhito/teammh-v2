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

function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Twitter|TikTok|Line\/|MicroMessenger|WhatsApp|Snapchat|Pinterest/i.test(
    window.navigator.userAgent
  );
}

// Sur iOS, seul Safari propose "Sur l'écran d'accueil". Chrome/Firefox/Edge iOS
// utilisent le moteur Safari mais n'ont pas ce bouton dans leur interface.
function isRealIosSafari(): boolean {
  return !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//i.test(window.navigator.userAgent);
}

function StepsBanner({
  color,
  title,
  steps,
  onDismiss,
}: {
  color: string;
  title: string;
  steps: React.ReactNode[];
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="w-full rounded-2xl bg-neutral-900 p-5 shadow-2xl"
        style={{ maxWidth: 420, border: `1px solid ${color}55` }}
      >
        <p className="mb-3 text-base font-bold text-white">{title}</p>
        <div className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              <p className="text-sm text-white">{step}</p>
            </div>
          ))}
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

const IOS_OPEN_IN_SAFARI_STEPS: React.ReactNode[] = [
  <>
    Appuie sur <span className="font-bold">•••</span> ou l&apos;icône de navigateur en bas ou en
    haut de l&apos;écran
  </>,
  <>
    Choisis <span className="font-bold">« Ouvrir dans Safari »</span> ou{" "}
    <span className="font-bold">« Ouvrir dans le navigateur »</span>
  </>,
  <>
    Une fois dans Safari, appuie sur l&apos;icône <span className="font-bold">Partager</span>{" "}
    <span aria-hidden>⬆️</span> en bas de l&apos;écran
  </>,
  <>
    Choisis <span className="font-bold">« Sur l&apos;écran d&apos;accueil »</span> puis{" "}
    <span className="font-bold">« Ajouter »</span>
  </>,
];

const ANDROID_OPEN_IN_CHROME_STEPS: React.ReactNode[] = [
  <>
    Appuie sur le menu <span className="font-bold">⋮</span> (3 points) en haut à droite de
    l&apos;écran
  </>,
  <>
    Choisis <span className="font-bold">« Ouvrir dans Chrome »</span> ou{" "}
    <span className="font-bold">« Ouvrir dans le navigateur »</span>
  </>,
  <>
    Si cette option n&apos;existe pas, ouvre l&apos;appli <span className="font-bold">Chrome</span>{" "}
    directement et colle l&apos;adresse du site dans la barre d&apos;adresse
  </>,
  <>
    Une fois dans Chrome, appuie sur le bouton <span className="font-bold">« Installer »</span>{" "}
    qui apparaît, ou ouvre le menu <span className="font-bold">⋮</span> puis choisis{" "}
    <span className="font-bold">« Ajouter à l&apos;écran d&apos;accueil »</span>
  </>,
];

export default function InstallPrompt({ color = "#B22222" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [showWrongBrowserBanner, setShowWrongBrowserBanner] = useState<"ios" | "android" | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ios = isIos();

    // Cas "mauvais endroit" : appli in-app (Instagram, TikTok...) ou, sur iOS,
    // un navigateur qui n'est pas vraiment Safari (Chrome/Firefox iOS). Dans ces
    // cas on ne perd pas de temps à attendre un événement natif qui n'arrivera
    // jamais : on affiche tout de suite "ouvre dans Chrome/Safari".
    if (isInAppBrowser() || (ios && !isRealIosSafari())) {
      setShowWrongBrowserBanner(ios ? "ios" : "android");
      return;
    }

    if (ios) {
      setShowIosBanner(true);
      return;
    }

    let gotNativePrompt = false;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      gotNativePrompt = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowWrongBrowserBanner(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Certains navigateurs Android (Mi Browser/MIUI sur Xiaomi/Redmi, anciens
    // Samsung Internet, UC Browser, etc.) ne déclenchent jamais beforeinstallprompt :
    // on invite alors à ouvrir le site dans Chrome, seul navigateur garanti pour
    // l'installation 1-clic.
    const fallbackTimer = window.setTimeout(() => {
      if (!gotNativePrompt) setShowWrongBrowserBanner("android");
    }, ANDROID_FALLBACK_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  if (dismissed || (!deferredPrompt && !showIosBanner && !showWrongBrowserBanner)) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (showWrongBrowserBanner === "ios") {
    return (
      <StepsBanner
        color={color}
        title="📲 Ouvre cette page dans Safari pour installer l'app"
        steps={IOS_OPEN_IN_SAFARI_STEPS}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  if (showWrongBrowserBanner === "android") {
    return (
      <StepsBanner
        color={color}
        title="📲 Ouvre cette page dans Chrome pour installer l'app"
        steps={ANDROID_OPEN_IN_CHROME_STEPS}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  if (showIosBanner) {
    return (
      <StepsBanner
        color={color}
        title="📲 Installer l'application sur ton écran d'accueil"
        steps={[
          <>
            Appuie sur <span className="font-bold">•••</span> en bas de l&apos;écran
          </>,
          <>
            Appuie sur l&apos;icône <span className="font-bold">Partager</span>{" "}
            <span aria-hidden>⬆️</span>
          </>,
          <>
            Choisis <span className="font-bold">« Sur l&apos;écran d&apos;accueil »</span> puis{" "}
            <span className="font-bold">« Ajouter »</span>
          </>,
        ]}
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
