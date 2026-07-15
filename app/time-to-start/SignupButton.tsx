"use client";

import { useState } from "react";

// Placeholder en attendant la connexion Stripe : remplacer le onClick par une
// redirection vers l'URL de checkout Stripe une fois l'intégration prête.
export default function SignupButton({ label, id }: { label: string; id: string }) {
  const [clicked, setClicked] = useState(false);

  if (clicked) {
    return (
      <p className="tts-signup-confirm" role="status">
        Parfait ! On te recontacte très vite pour finaliser ton inscription.
      </p>
    );
  }

  return (
    <button
      id={id}
      data-event="tts_cta_signup_click"
      className="tts-btn tts-btn-primary tts-btn-block"
      onClick={() => setClicked(true)}
    >
      {label}
    </button>
  );
}
