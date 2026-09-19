"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import "../../inscription-ttl/inscription.css";

export default function DefinirMotDePasse({ sessionId, prenom, email }: { sessionId: string; prenom: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function valider() {
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inscription-ttl/finaliser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      // Le compte vient d'être créé côté serveur : on se connecte tout de
      // suite pour ouvrir l'app directement, sans repasser par /login.
      const supabase = createSupabaseBrowserClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        window.location.href = "/login";
        return;
      }
      localStorage.setItem("ttl_show_welcome_new", "1");
      window.location.href = "/ttl";
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="vq">
      <div className="vq-top">
        <span />
        <div className="vq-progress" />
        <span className="vq-brand">TIME TO <span>LIVE</span></span>
      </div>

      <div className="vq-body">
        <div className="vq-step">
          <span className="vq-kicker"><i /> Paiement confirmé</span>
          <h1 className="vq-question">
            Bienvenue, <span>{prenom || "toi"}</span>.<br />Choisis ton mot de passe.
          </h1>

          <div className="vq-field">
            <label className="vq-label">Mot de passe</label>
            <input
              className="vq-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              autoFocus
              autoComplete="new-password"
            />
          </div>
          <div className="vq-field">
            <label className="vq-label">Confirmer</label>
            <input
              className="vq-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="vq-error">{error}</p>}

          <button className="vq-cta" onClick={valider} disabled={loading}>
            {loading ? "Création..." : "Entrer dans l'app →"}
          </button>
        </div>
      </div>
    </div>
  );
}
