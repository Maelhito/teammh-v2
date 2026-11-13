"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

/**
 * « Supprimer mon compte » — obligatoire pour l'App Store et Google Play.
 * Volontairement discret et en deux temps : un lien, puis un encadré où il
 * faut écrire SUPPRIMER. Rien ne part sur un simple appui.
 */

const MOT = "SUPPRIMER";

type Theme = "ttm" | "ttl";

const COULEURS: Record<Theme, { carte: string; bord: string; texte: string; doux: string; champ: string }> = {
  ttm: { carte: "#1A1A1A", bord: "#2A2A2A", texte: "#F5F5F0", doux: "rgba(255,255,255,0.5)", champ: "#0D0D0D" },
  ttl: { carte: "var(--ttl-card)", bord: "var(--ttl-card-border)", texte: "var(--ttl-text)", doux: "var(--ttl-muted)", champ: "var(--ttl-bg)" },
};

export default function SupprimerMonCompte({ theme, abonnement = false }: { theme: Theme; abonnement?: boolean }) {
  const c = COULEURS[theme];
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const pret = saisie.trim().toUpperCase() === MOT;

  async function supprimer() {
    if (!pret || enCours) return;
    setEnCours(true);
    setErreur("");
    try {
      const res = await fetch("/api/profil/compte", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: MOT }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErreur(data.error ?? "La suppression a échoué.");
        setEnCours(false);
        return;
      }
      // Le compte n'existe plus : on efface la session de l'appareil, sans
      // s'arrêter si le serveur ne la reconnaît déjà plus.
      await createSupabaseBrowserClient().auth.signOut().catch(() => {});
      window.location.href = "/login";
    } catch {
      setErreur("Impossible de contacter le serveur.");
      setEnCours(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="font-body"
        style={{ display: "block", width: "100%", background: "none", border: "none", padding: "14px 0 0", color: c.doux, fontSize: 12, textDecoration: "underline", cursor: "pointer", textAlign: "center" }}
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="font-body" style={{ background: c.carte, border: "1px solid #B22222", borderRadius: 16, padding: 18, marginTop: 16 }}>
      <p style={{ margin: 0, color: c.texte, fontSize: 15, fontWeight: 700 }}>Supprimer mon compte</p>
      <p style={{ margin: "10px 0 0", color: c.doux, fontSize: 13, lineHeight: 1.55 }}>
        Tout est effacé définitivement : ton profil, tes mesures, tes photos, tes séances et ton suivi.
        {abonnement ? " Ton abonnement est arrêté : tu ne seras plus prélevée." : ""} Personne ne pourra les récupérer, pas même l&apos;équipe.
      </p>
      <label style={{ display: "block", margin: "14px 0 6px", color: c.doux, fontSize: 12 }}>
        Pour confirmer, écris {MOT}
      </label>
      <input
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        placeholder={MOT}
        style={{ width: "100%", boxSizing: "border-box", background: c.champ, border: `1px solid ${c.bord}`, borderRadius: 12, padding: "12px 14px", color: c.texte, fontSize: 16, outline: "none" }}
      />
      {erreur && <p style={{ margin: "10px 0 0", color: "#B22222", fontSize: 13, lineHeight: 1.5 }}>{erreur}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => { setOuvert(false); setSaisie(""); setErreur(""); }}
          disabled={enCours}
          style={{ flex: 1, background: "transparent", border: `1px solid ${c.bord}`, borderRadius: 12, padding: "12px 0", color: c.texte, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={supprimer}
          disabled={!pret || enCours}
          style={{ flex: 1, background: "#B22222", border: "none", borderRadius: 12, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: pret && !enCours ? "pointer" : "not-allowed", opacity: pret && !enCours ? 1 : 0.45 }}
        >
          {enCours ? "Suppression…" : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
