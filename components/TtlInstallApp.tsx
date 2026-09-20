"use client";

import { useEffect, useState } from "react";
import { ttlColors } from "@/lib/ttl-theme";

/**
 * Invite à installer l'app sur l'écran d'accueil.
 *
 * Aucun navigateur ne permet d'installer d'un seul clic partout :
 *  - Android / ordinateur (Chrome, Edge) : `beforeinstallprompt` ouvre la vraie
 *    fenêtre d'installation, donc bouton direct.
 *  - iPhone : Apple ne fournit aucune API, l'installation passe forcément par
 *    Partager → « Sur l'écran d'accueil ». On montre donc le geste.
 *  - Navigateurs intégrés (Instagram, Facebook, Messenger) : l'installation y
 *    est carrément impossible. Comme une bonne partie du trafic vient des pubs
 *    Meta, on les renvoie explicitement vers Safari ou Chrome, sinon la cliente
 *    tourne en rond sans comprendre pourquoi ça ne marche pas.
 */

interface PromptInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Contexte = "installable" | "ios" | "navigateur-integre" | "autre";

const CLE_REPORT = "ttl_install_reporte";
const JOURS_AVANT_RELANCE = 7;

function estInstallee(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS n'implémente pas display-mode, il expose ce drapeau à la place.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detecterContexte(): Contexte {
  const ua = window.navigator.userAgent;
  if (/FBAN|FBAV|Instagram|Messenger|Line\//i.test(ua)) return "navigateur-integre";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "autre";
}

function reportRecent(): boolean {
  try {
    const brut = localStorage.getItem(CLE_REPORT);
    if (!brut) return false;
    return Date.now() - Number(brut) < JOURS_AVANT_RELANCE * 86400000;
  } catch {
    return false;
  }
}

export default function TtlInstallApp() {
  const [contexte, setContexte] = useState<Contexte | null>(null);
  const [prompt, setPrompt] = useState<PromptInstallation | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [masque, setMasque] = useState(true);

  useEffect(() => {
    if (estInstallee() || reportRecent()) return;

    setContexte(detecterContexte());
    setMasque(false);

    function onPrompt(e: Event) {
      // Sans ça, Chrome affiche sa propre bannière en plus de la nôtre.
      e.preventDefault();
      setPrompt(e as PromptInstallation);
      setContexte("installable");
    }
    function onInstalled() {
      setMasque(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function reporter() {
    try { localStorage.setItem(CLE_REPORT, String(Date.now())); } catch {}
    setMasque(true);
    setOuvert(false);
  }

  async function installer() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setMasque(true);
    setPrompt(null);
  }

  if (masque || !contexte) return null;

  const texteBouton = contexte === "installable" ? "Installer l'app" : "Comment faire ?";

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(178,34,34,0.22) 0%, rgba(178,34,34,0.08) 100%)",
          border: "1px solid rgba(230,57,70,0.4)",
          borderRadius: 16,
          padding: "14px 14px 13px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
          <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>📲</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-body" style={{ color: "#fff", fontSize: 13.5, fontWeight: 700, margin: "0 0 3px", lineHeight: 1.3 }}>
              Garde l&apos;app sur ton écran d&apos;accueil
            </p>
            <p className="font-body" style={{ color: ttlColors.muted, fontSize: 11.5, margin: 0, lineHeight: 1.4 }}>
              Tu l&apos;ouvres en un geste, sans passer par ton navigateur.
            </p>
          </div>
          <button
            onClick={reporter}
            aria-label="Plus tard"
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              color: ttlColors.muted,
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              padding: "0 2px",
            }}
          >
            ×
          </button>
        </div>
        <button
          onClick={() => (contexte === "installable" ? installer() : setOuvert(true))}
          className="font-body"
          style={{
            width: "100%",
            marginTop: 12,
            background: ttlColors.red,
            border: "none",
            borderRadius: 10,
            padding: "11px 0",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {texteBouton}
        </button>
      </div>

      {ouvert && (
        <div
          onClick={() => setOuvert(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: ttlColors.card,
              borderTop: `2px solid ${ttlColors.red}`,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: "22px 20px calc(26px + env(safe-area-inset-bottom, 0px))",
              width: "100%",
              maxWidth: 480,
            }}
          >
            <div style={{ width: 38, height: 4, borderRadius: 4, background: ttlColors.cardBorder, margin: "0 auto 18px" }} />

            {contexte === "navigateur-integre" ? (
              <>
                <p className="font-body" style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>
                  Ouvre d&apos;abord dans ton navigateur
                </p>
                <p className="font-body" style={{ color: ttlColors.muted, fontSize: 13.5, lineHeight: 1.6, margin: "0 0 18px" }}>
                  Tu es dans le navigateur d&apos;Instagram ou Facebook : l&apos;installation n&apos;y est pas
                  possible. Appuie sur les trois points <b style={{ color: "#fff" }}>···</b> en haut à droite,
                  puis sur <b style={{ color: "#fff" }}>« Ouvrir dans le navigateur »</b> (Safari ou Chrome).
                  Une fois là-bas, reviens ici et le bouton fonctionnera.
                </p>
              </>
            ) : contexte === "ios" ? (
              <>
                <p className="font-body" style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                  Deux gestes, et c&apos;est fait
                </p>
                <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12.5, margin: "0 0 18px" }}>
                  Sur iPhone, Apple demande de le faire à la main.
                </p>
                <Etape numero="1">
                  Appuie sur{" "}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, verticalAlign: "middle" }}>
                    <svg width="15" height="18" viewBox="0 0 20 24" fill="none" stroke="#E63946" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v13" />
                      <path d="M5.5 6.5 10 2l4.5 4.5" />
                      <path d="M4 12v9h12v-9" />
                    </svg>
                    <b style={{ color: "#fff" }}>Partager</b>
                  </span>{" "}
                  en bas de Safari.
                </Etape>
                <Etape numero="2">
                  Descends et choisis <b style={{ color: "#fff" }}>« Sur l&apos;écran d&apos;accueil »</b>, puis
                  <b style={{ color: "#fff" }}> Ajouter</b>.
                </Etape>
              </>
            ) : (
              <>
                <p className="font-body" style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                  Ajoute l&apos;app à ton écran d&apos;accueil
                </p>
                <p className="font-body" style={{ color: ttlColors.muted, fontSize: 12.5, margin: "0 0 18px" }}>
                  Depuis le menu de ton navigateur.
                </p>
                <Etape numero="1">
                  Appuie sur les trois points <b style={{ color: "#fff" }}>⋮</b> en haut à droite.
                </Etape>
                <Etape numero="2">
                  Choisis <b style={{ color: "#fff" }}>« Installer l&apos;application »</b> ou
                  <b style={{ color: "#fff" }}> « Ajouter à l&apos;écran d&apos;accueil »</b>.
                </Etape>
              </>
            )}

            <button
              onClick={() => setOuvert(false)}
              className="font-body"
              style={{
                width: "100%",
                marginTop: 8,
                background: ttlColors.red,
                border: "none",
                borderRadius: 12,
                padding: "14px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              J&apos;ai compris
            </button>
            <button
              onClick={reporter}
              className="font-body"
              style={{
                width: "100%",
                marginTop: 10,
                background: "none",
                border: "none",
                color: ttlColors.muted,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Ne plus me le proposer pour l&apos;instant
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Etape({ numero, children }: { numero: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
      <span
        className="font-body"
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(178,34,34,0.2)",
          border: "1px solid rgba(230,57,70,0.45)",
          color: ttlColors.redBright,
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {numero}
      </span>
      <p className="font-body" style={{ color: "rgba(245,245,240,0.85)", fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}
