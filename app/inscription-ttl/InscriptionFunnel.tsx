"use client";

import { useState } from "react";
import Link from "next/link";
import "./inscription.css";

const FREINS = [
  { value: "temps", emoji: "⏱️", label: "Le manque de temps", sub: "Entre le travail et le reste, difficile de caser une séance" },
  { value: "motivation", emoji: "🔋", label: "La motivation qui va et vient", sub: "Ça part fort, puis ça retombe après deux semaines" },
  { value: "commencer", emoji: "🧭", label: "Je ne sais pas par où commencer", sub: "Trop d'infos contradictoires, aucun plan clair" },
  { value: "alimentation", emoji: "🍽️", label: "L'alimentation", sub: "Je sais faire du sport, mais pas quoi manger" },
  { value: "autre", emoji: "✨", label: "Autre chose", sub: "Dis-nous en quelques mots" },
] as const;

type FreinValue = (typeof FREINS)[number]["value"];

type Step =
  | "poids"
  | "poids_vise"
  | "frein"
  | "frein_autre"
  | "pret"
  | "identite"
  | "email";

const ORDRE: Step[] = ["poids", "poids_vise", "frein", "pret", "identite", "email"];

function fuseauAppareil(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

export default function InscriptionFunnel() {
  const [historique, setHistorique] = useState<Step[]>(["poids"]);
  const [direction, setDirection] = useState<"avant" | "arriere">("avant");
  const step = historique[historique.length - 1];

  const [poids, setPoids] = useState("");
  const [poidsVise, setPoidsVise] = useState("");
  const [frein, setFrein] = useState<FreinValue | "">("");
  const [freinAutre, setFreinAutre] = useState("");
  const [pretADemarrer, setPretADemarrer] = useState<boolean | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function aller(prochain: Step) {
    setDirection("avant");
    setError("");
    setHistorique((h) => [...h, prochain]);
  }
  function reculer() {
    if (historique.length <= 1) return;
    setDirection("arriere");
    setError("");
    setHistorique((h) => h.slice(0, -1));
  }

  const positionActuelle = Math.max(0, ORDRE.indexOf(step === "frein_autre" ? "frein" : step));

  function validerPoids() {
    setError("");
    aller("poids_vise");
  }

  function validerPoidsVise() {
    setError("");
    aller("frein");
  }

  function choisirFrein(v: FreinValue) {
    setFrein(v);
    if (v === "autre") {
      aller("frein_autre");
    } else {
      aller("pret");
    }
  }

  function choisirPret(v: boolean) {
    setPretADemarrer(v);
    aller("identite");
  }

  function validerIdentite() {
    if (!prenom.trim()) {
      setError("Dis-nous au moins ton prénom.");
      return;
    }
    aller("email");
  }

  async function lancerPaiement() {
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Une adresse email valide, s'il te plaît.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ttl/checkout-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom,
          nom,
          email,
          poids: poids ? Number(poids.replace(",", ".")) : null,
          poidsVise: poidsVise ? Number(poidsVise.replace(",", ".")) : null,
          frein: frein === "autre" ? freinAutre : FREINS.find((f) => f.value === frein)?.label,
          pretADemarrer,
          timezone: fuseauAppareil(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Impossible de lancer le paiement.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="vq">
      <div className="vq-top">
        <button className="vq-back" onClick={reculer} disabled={historique.length <= 1} aria-label="Étape précédente">‹</button>
        <div className="vq-progress">
          {ORDRE.map((s, i) => (
            <div key={s} className={`vq-progress-seg${i < positionActuelle ? " is-done" : i === positionActuelle ? " is-now" : ""}`}>
              <i />
            </div>
          ))}
        </div>
        <span className="vq-brand">TIME TO <span>LIVE</span></span>
      </div>

      <div className="vq-body">
        <div className={`vq-step${direction === "arriere" ? " vq-back-anim" : ""}`} key={step}>
          {step === "poids" && (
            <>
              <span className="vq-kicker"><i /> 1 / 6</span>
              <h1 className="vq-question">Quel est <span>ton poids</span> aujourd&apos;hui ?</h1>
              <div className="vq-field">
                <div className="vq-suffix-wrap">
                  <input
                    className="vq-input"
                    type="number"
                    inputMode="decimal"
                    placeholder="Ex : 72"
                    value={poids}
                    onChange={(e) => setPoids(e.target.value)}
                    autoFocus
                  />
                  <span className="vq-suffix">kg</span>
                </div>
              </div>
              {error && <p className="vq-error">{error}</p>}
              <button className="vq-cta" onClick={validerPoids}>Continuer</button>
              <button className="vq-skip" onClick={() => { setPoids(""); aller("poids_vise"); }}>Je préfère ne pas le dire</button>
            </>
          )}

          {step === "poids_vise" && (
            <>
              <span className="vq-kicker"><i /> 2 / 6</span>
              <h1 className="vq-question">Quel poids <span>vises-tu</span> ?</h1>
              <div className="vq-field">
                <div className="vq-suffix-wrap">
                  <input
                    className="vq-input"
                    type="number"
                    inputMode="decimal"
                    placeholder="Ex : 65"
                    value={poidsVise}
                    onChange={(e) => setPoidsVise(e.target.value)}
                    autoFocus
                  />
                  <span className="vq-suffix">kg</span>
                </div>
              </div>
              {error && <p className="vq-error">{error}</p>}
              <button className="vq-cta" onClick={validerPoidsVise}>Continuer</button>
              <button className="vq-skip" onClick={() => { setPoidsVise(""); aller("frein"); }}>Je préfère ne pas le dire</button>
            </>
          )}

          {step === "frein" && (
            <>
              <span className="vq-kicker"><i /> 3 / 6</span>
              <h1 className="vq-question">Qu&apos;est-ce qui te <span>freine</span> aujourd&apos;hui ?</h1>
              <div className="vq-options">
                {FREINS.map((f) => (
                  <button
                    key={f.value}
                    className={`vq-option${frein === f.value ? " is-selected" : ""}`}
                    onClick={() => choisirFrein(f.value)}
                  >
                    <span className="vq-option-emoji">{f.emoji}</span>
                    <span className="vq-option-txt">
                      {f.label}
                      <span className="vq-option-sub">{f.sub}</span>
                    </span>
                    <span className="vq-option-arrow">→</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "frein_autre" && (
            <>
              <span className="vq-kicker"><i /> 3 / 6</span>
              <h1 className="vq-question">Dis-nous <span>en quelques mots</span>.</h1>
              <div className="vq-field">
                <textarea
                  className="vq-input"
                  rows={4}
                  placeholder="Ce qui te freine..."
                  value={freinAutre}
                  onChange={(e) => setFreinAutre(e.target.value)}
                  autoFocus
                  style={{ resize: "none" }}
                />
              </div>
              <button className="vq-cta" onClick={() => aller("pret")}>Continuer</button>
            </>
          )}

          {step === "pret" && (
            <>
              <span className="vq-kicker"><i /> 4 / 6</span>
              <h1 className="vq-question">Prête à démarrer <span>cette semaine</span> ?</h1>
              <div className="vq-duo">
                <button className="vq-duo-btn is-yes" onClick={() => choisirPret(true)}>
                  <span className="vq-duo-emoji">🔥</span>
                  <span className="vq-duo-lbl">Oui, je me lance</span>
                </button>
                <button className="vq-duo-btn" onClick={() => choisirPret(false)}>
                  <span className="vq-duo-emoji">🌱</span>
                  <span className="vq-duo-lbl">Pas encore</span>
                </button>
              </div>
            </>
          )}

          {step === "identite" && (
            <>
              <span className="vq-kicker"><i /> 5 / 6</span>
              <h1 className="vq-question">Comment <span>on t&apos;appelle</span> ?</h1>
              <div className="vq-field">
                <label className="vq-label">Prénom</label>
                <input className="vq-input" type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Marie" autoFocus autoComplete="given-name" />
              </div>
              <div className="vq-field">
                <label className="vq-label">Nom</label>
                <input className="vq-input" type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" autoComplete="family-name" />
              </div>
              {error && <p className="vq-error">{error}</p>}
              <button className="vq-cta" onClick={validerIdentite}>Continuer</button>
            </>
          )}

          {step === "email" && (
            <>
              <span className="vq-kicker"><i /> 6 / 6</span>
              <h1 className="vq-question">Ton <span>email</span> ?</h1>
              <div className="vq-field">
                <input className="vq-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" autoFocus autoComplete="email" />
              </div>
              {error && <p className="vq-error">{error}</p>}
              <button className="vq-cta" onClick={lancerPaiement} disabled={loading}>
                {loading ? "Un instant..." : "Continuer vers le paiement →"}
              </button>
              <p className="vq-skip" style={{ textDecoration: "none", cursor: "default" }}>
                6 000 XPF/mois, sans engagement. Ton compte se crée juste après.
              </p>
            </>
          )}

          <p className="vq-login">
            Déjà un compte ? <Link href="/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
