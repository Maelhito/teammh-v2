"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Theme = "clair" | "sombre";

/**
 * Les fuseaux qui comptent pour TeamMJ, mis en tête de liste. Le reste du
 * monde reste accessible juste en dessous — une cliente peut partir n'importe
 * où, et c'est exactement le cas qu'il ne faut pas rendre pénible.
 */
const FUSEAUX_COURANTS = [
  { tz: "Pacific/Noumea", libelle: "Nouvelle-Calédonie — Nouméa" },
  { tz: "Asia/Makassar", libelle: "Bali — Denpasar" },
  { tz: "Australia/Brisbane", libelle: "Australie — Brisbane" },
  { tz: "Australia/Sydney", libelle: "Australie — Sydney" },
  { tz: "Australia/Perth", libelle: "Australie — Perth" },
  { tz: "Europe/Paris", libelle: "France — Paris" },
  { tz: "Indian/Reunion", libelle: "La Réunion" },
  { tz: "Pacific/Tahiti", libelle: "Polynésie — Tahiti" },
];

function tousLesFuseaux(): string[] {
  try {
    const f = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof f === "function") return f("timeZone");
  } catch { /* navigateur trop ancien */ }
  return FUSEAUX_COURANTS.map((f) => f.tz);
}

function decalage(tz: string, maintenant: Date): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).formatToParts(maintenant).map((p) => [p.type, p.value])
    );
    const commeUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour) % 24, Number(parts.minute)
    );
    const min = Math.round((commeUtc - Math.floor(maintenant.getTime() / 60000) * 60000) / 60000);
    const signe = min < 0 ? "-" : "+";
    const abs = Math.abs(min);
    return `UTC${signe}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function heureLocale(tz: string, maintenant: Date): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(maintenant);
  } catch {
    return "--:--";
  }
}

/**
 * Réglage du fuseau horaire, commun à la cliente, au coach et à l'admin.
 *
 * Il est visible — et pas caché dans un réglage avancé — parce que c'est lui
 * qui décide de l'heure à laquelle une personne voit ses rendez-vous et reçoit
 * ses notifications. Quand il est faux, tout le reste est faux.
 */
export default function ReglageFuseau({ theme = "sombre" }: { theme?: Theme }) {
  const sombre = theme === "sombre";
  const [fuseau, setFuseau] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [edition, setEdition] = useState(false);
  const [choix, setChoix] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  // Rien de dépendant du fuseau n'est calculé pendant le rendu serveur : là-bas,
  // `Intl` renvoie le fuseau de la machine Vercel (UTC), pas celui de la
  // personne. L'afficher, même une fraction de seconde, ferait clignoter une
  // mauvaise ville et provoquerait un écart d'hydratation.
  const [fuseauAppareil, setFuseauAppareil] = useState<string | null>(null);

  useEffect(() => {
    try { setFuseauAppareil(Intl.DateTimeFormat().resolvedOptions().timeZone || null); } catch {}
    setMaintenant(new Date());
    const t = setInterval(() => setMaintenant(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/fuseau");
      if (!res.ok) return;
      const d = await res.json();
      setFuseau(d.timezone ?? null);
      setAuto(d.auto !== false);
      setChoix(d.timezone ?? "");
    } catch { /* hors ligne : on affiche simplement l'appareil */ }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(tz: string, estAuto: boolean) {
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fuseau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz, auto: estAuto }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(d.error ?? "Erreur lors de l'enregistrement"); return; }
      setFuseau(d.timezone ?? tz);
      setAuto(estAuto);
      setEdition(false);
      // Le cache de SyncFuseau devient faux : on le vide pour qu'il reparte
      // d'une détection propre au prochain chargement.
      try { localStorage.removeItem("teammj_fuseau"); } catch {}
      setMessage("✓ Fuseau enregistré");
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage("Erreur réseau");
    } finally {
      setEnCours(false);
    }
  }

  const affiche = fuseau ?? fuseauAppareil;
  const ville = affiche ? (affiche.split("/").pop() ?? affiche).replace(/_/g, " ") : null;
  const liste = useMemo(() => {
    const courants = FUSEAUX_COURANTS.map((f) => f.tz);
    return tousLesFuseaux().filter((tz) => !courants.includes(tz));
  }, []);

  const couleurs = sombre
    ? { fond: "#111111", bord: "#1a1a1a", titre: "#F5F5F0", texte: "rgba(255,255,255,0.55)", doux: "rgba(255,255,255,0.35)", champFond: "#0D0D0D", champBord: "rgba(255,255,255,0.12)", champTexte: "#FFFFFF" }
    : { fond: "#fff", bord: "#e8e8e8", titre: "#1a1a1a", texte: "#666", doux: "#aaa", champFond: "#fff", champBord: "#e8e8e8", champTexte: "#1a1a1a" };

  const styleChamp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 9,
    border: `1px solid ${couleurs.champBord}`, backgroundColor: couleurs.champFond,
    color: couleurs.champTexte, fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ backgroundColor: couleurs.fond, border: `1px solid ${couleurs.bord}`, borderRadius: sombre ? 18 : 14, padding: "18px 20px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 3, height: 16, backgroundColor: "#B22222", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
        <h2 style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0, color: couleurs.titre }}>
          FUSEAU HORAIRE
        </h2>
      </div>

      {!edition ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", minHeight: 22 }}>
            {affiche ? (
              <>
                <span style={{ fontSize: 16, fontWeight: 700, color: couleurs.titre }}>{ville}</span>
                {maintenant && (
                  <span style={{ fontSize: 13, color: couleurs.texte }}>
                    il est {heureLocale(affiche, maintenant)} · {decalage(affiche, maintenant)}
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: 13, color: couleurs.doux }}>Détection en cours…</span>
            )}
          </div>

          {affiche && (
            <p style={{ fontSize: 12, color: couleurs.doux, margin: "8px 0 0", lineHeight: 1.5 }}>
              {auto
                ? "Détecté automatiquement depuis ton appareil — tes rendez-vous et tes notifications suivent si tu changes de pays."
                : "Choisi à la main — il ne bougera pas, même si tu voyages."}
            </p>
          )}

          {auto && fuseauAppareil && fuseau && fuseauAppareil !== fuseau && (
            <p style={{ fontSize: 12, color: "#B22222", margin: "8px 0 0", lineHeight: 1.5 }}>
              Ton appareil est sur {(fuseauAppareil.split("/").pop() ?? "").replace(/_/g, " ")} — recharge la page pour le mettre à jour.
            </p>
          )}

          <button
            type="button"
            onClick={() => { setChoix(fuseau ?? fuseauAppareil ?? ""); setEdition(true); }}
            style={{ background: "none", border: "none", padding: 0, marginTop: 12, color: couleurs.doux, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
          >
            Modifier
          </button>
        </>
      ) : (
        <>
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            style={{ ...styleChamp, marginBottom: 12 }}
          >
            <optgroup label="Le plus souvent">
              {FUSEAUX_COURANTS.map((f) => (
                <option key={f.tz} value={f.tz}>{f.libelle}</option>
              ))}
            </optgroup>
            <optgroup label="Tous les fuseaux">
              {liste.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </optgroup>
          </select>

          {maintenant && choix && (
            <p style={{ fontSize: 12, color: couleurs.texte, margin: "0 0 14px" }}>
              Il y serait {heureLocale(choix, maintenant)} · {decalage(choix, maintenant)}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={enCours || !choix}
              onClick={() => enregistrer(choix, false)}
              style={{ padding: "10px 14px", borderRadius: 9, border: "none", backgroundColor: enCours ? "#555" : "#B22222", color: "#fff", fontSize: 13, fontWeight: 700, cursor: enCours ? "default" : "pointer" }}
            >
              Utiliser ce fuseau
            </button>
            {fuseauAppareil && (
              <button
                type="button"
                disabled={enCours}
                onClick={() => enregistrer(fuseauAppareil, true)}
                style={{ padding: "10px 14px", borderRadius: 9, border: `1px solid ${couleurs.champBord}`, backgroundColor: "transparent", color: couleurs.titre, fontSize: 13, fontWeight: 700, cursor: enCours ? "default" : "pointer" }}
              >
                Suivre mon appareil
              </button>
            )}
            <button
              type="button"
              disabled={enCours}
              onClick={() => { setEdition(false); setMessage(null); }}
              style={{ padding: "10px 14px", borderRadius: 9, border: "none", background: "none", color: couleurs.doux, fontSize: 13, cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </>
      )}

      {message && (
        <p style={{ fontSize: 12, color: message.startsWith("✓") ? "#4ADE80" : "#F87171", margin: "10px 0 0" }}>
          {message}
        </p>
      )}
    </div>
  );
}
