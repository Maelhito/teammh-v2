/**
 * Reconstitutions fidèles des écrans de l'app, pour la page de vente.
 * Volontairement autonomes (aucune donnée réelle, aucun appel réseau) : la page
 * est publique et doit s'afficher instantanément, même déconnecté.
 */

type Onglet = "accueil" | "sport" | "alimentation" | "profil";

const ONGLETS: { key: Onglet; icon: string; label: string }[] = [
  { key: "accueil", icon: "⌂", label: "Accueil" },
  { key: "sport", icon: "🏋️", label: "Sport" },
  { key: "alimentation", icon: "🥗", label: "Alimentation" },
  { key: "profil", icon: "◯", label: "Profil" },
];

function BottomNav({ actif }: { actif: Onglet }) {
  return (
    <div className="v-app-nav">
      {ONGLETS.map((o) => (
        <div key={o.key} className={o.key === actif ? "is-on" : undefined}>
          <div className="v-nav-ico">{o.icon}</div>
          <span className="v-nav-lbl">{o.label}</span>
        </div>
      ))}
    </div>
  );
}

function AnneauProgression({ pct }: { pct: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="v-ring">
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="#262020" strokeWidth="4" />
        <circle
          cx="23" cy="23" r={r} fill="none"
          stroke="#E63946" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span>{Math.round(pct * 100)}%</span>
    </div>
  );
}

function EcranAccueil() {
  return (
    <div className="v-screen">
      <div className="v-app-head">
        <div className="v-app-row">
          <div className="v-app-logo">🔥</div>
          <span className="v-app-pill" style={{ margin: 0 }}>🔥 12 jours</span>
        </div>
        <p className="v-app-hello">Bonjour, <b>Marie</b></p>
        <div>
          <span className="v-app-pill">TIME TO LIVE</span>
          <span className="v-app-pill">🔥 Perdre du poids</span>
        </div>
      </div>

      <div className="v-app-body">
        <p className="v-app-note">Chaque séance te rapproche de ton objectif.</p>

        <div className="v-app-card v-mission">
          <AnneauProgression pct={0.6} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="v-mission-kicker">TA MISSION DU JOUR</p>
            <p className="v-mission-title">Module 2 — Démarrer ton sport</p>
            <div className="v-mission-cta">Continuer →</div>
          </div>
        </div>

        <p className="v-app-label">🥗 Recette du jour</p>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #262020", background: "#121010" }}>
          <div className="v-shot v-food" style={{ borderRadius: 0, border: "none" }}>
            <span className="v-shot-emoji">🥑</span>
          </div>
          <div className="v-meta-row">
            <span>Petit-déjeuner · 320 kcal</span>
            <b>Voir en grand ›</b>
          </div>
        </div>

        <p className="v-app-label">Mon parcours <span style={{ color: "#545049", fontWeight: 400 }}>3/6</span></p>
        <div className="v-timeline">
          <div className="v-tl-item">
            <div className="v-tl-node is-done">✓</div>
            <div className="v-tl-bar"><span>Bienvenue</span></div>
          </div>
          <div className="v-tl-item">
            <div className="v-tl-node is-now">▶</div>
            <div className="v-tl-bar is-now"><span>Démarrer ton sport</span></div>
          </div>
          <div className="v-tl-item">
            <div className="v-tl-node">🔒</div>
            <div className="v-tl-bar"><span>Ton alimentation</span></div>
          </div>
        </div>
      </div>

      <BottomNav actif="accueil" />
    </div>
  );
}

function EcranSport() {
  return (
    <div className="v-screen">
      <div className="v-app-head">
        <div className="v-app-row">
          <span className="v-app-back">‹ Retour</span>
          <span style={{ fontSize: 12 }}>⚙️</span>
        </div>
        <p className="v-app-title">Sport</p>
        <p className="v-app-sub">Ton programme du mois</p>
      </div>

      <div className="v-app-body">
        <div className="v-shot v-sport" style={{ marginBottom: 11 }}>
          <div className="v-shot-veil" />
          <div className="v-shot-txt">
            <p className="v-shot-kicker">EN COURS</p>
            <p className="v-shot-title">Mois 2 — Renforcement</p>
          </div>
        </div>

        <div className="v-chips">
          <span className="v-chip is-on">Semaine 1</span>
          <span className="v-chip">Semaine 2</span>
          <span className="v-chip">Semaine 3</span>
          <span className="v-chip">S4</span>
        </div>

        <div className="v-line">
          <div className="v-line-ico">▶</div>
          <div className="v-line-txt">
            <b>Séance 1 · Bas du corps</b>
            <span>28 min</span>
          </div>
          <span className="v-line-tag">Validée</span>
        </div>
        <div className="v-line">
          <div className="v-line-ico">▶</div>
          <div className="v-line-txt">
            <b>Séance 2 · Haut du corps</b>
            <span>24 min</span>
          </div>
          <span className="v-line-tag">Validée</span>
        </div>
        <div className="v-line">
          <div className="v-line-ico">▶</div>
          <div className="v-line-txt">
            <b>Séance 3 · Full body</b>
            <span>31 min</span>
          </div>
          <span className="v-line-tag v-todo">À faire</span>
        </div>

        <p className="v-app-label">Mois précédents</p>
        <div className="v-line">
          <div className="v-line-ico">📁</div>
          <div className="v-line-txt">
            <b>Mois 1 — Reprise</b>
            <span>3 séances</span>
          </div>
          <span style={{ fontSize: 10, color: "#545049" }}>›</span>
        </div>
      </div>

      <BottomNav actif="sport" />
    </div>
  );
}

function EcranAlimentation() {
  return (
    <div className="v-screen">
      <div className="v-app-head">
        <div className="v-app-row">
          <span className="v-app-back">‹ Retour</span>
          <span style={{ fontSize: 12 }}>⚙️</span>
        </div>
        <p className="v-app-title">Alimentation</p>
        <p className="v-app-sub">Plans alimentaires et recettes</p>
      </div>

      <div className="v-app-body">
        <div className="v-chips">
          <span className="v-chip is-on">Plans</span>
          <span className="v-chip">Recettes</span>
        </div>

        <div className="v-line">
          <div className="v-line-ico">📄</div>
          <div className="v-line-txt">
            <b>Plan 1 600 kcal</b>
            <span>Septembre · PDF</span>
          </div>
          <span className="v-line-tag">Ouvrir</span>
        </div>
        <div className="v-line">
          <div className="v-line-ico">📄</div>
          <div className="v-line-txt">
            <b>Plan 1 800 kcal</b>
            <span>Septembre · PDF</span>
          </div>
          <span style={{ fontSize: 10, color: "#545049" }}>›</span>
        </div>

        <p className="v-app-label">Recettes du mois</p>
        <div className="v-grid2">
          <div className="v-shot v-food">
            <span className="v-shot-emoji">🥗</span>
            <div className="v-shot-veil" />
            <div className="v-shot-txt"><p className="v-shot-title" style={{ fontSize: 9 }}>Bowl protéiné</p></div>
          </div>
          <div className="v-shot v-food2">
            <span className="v-shot-emoji">🍳</span>
            <div className="v-shot-veil" />
            <div className="v-shot-txt"><p className="v-shot-title" style={{ fontSize: 9 }}>Omelette express</p></div>
          </div>
          <div className="v-shot v-food3">
            <span className="v-shot-emoji">🍓</span>
            <div className="v-shot-veil" />
            <div className="v-shot-txt"><p className="v-shot-title" style={{ fontSize: 9 }}>Porridge fruits</p></div>
          </div>
          <div className="v-shot v-food">
            <span className="v-shot-emoji">🍗</span>
            <div className="v-shot-veil" />
            <div className="v-shot-txt"><p className="v-shot-title" style={{ fontSize: 9 }}>Poulet citron</p></div>
          </div>
        </div>
      </div>

      <BottomNav actif="alimentation" />
    </div>
  );
}

function EcranProfil() {
  return (
    <div className="v-screen">
      <div className="v-app-head">
        <div className="v-app-row">
          <span className="v-app-back">‹ Retour</span>
          <span style={{ fontSize: 12 }}>⚙️</span>
        </div>
        <p className="v-app-title">Mon profil</p>
      </div>

      <div className="v-app-body">
        <div className="v-app-card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(140deg,#2a1c1c,#1a1414)", border: "1.5px solid rgba(230,57,70,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#E63946", fontWeight: 700 }}>M</div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: 0 }}>Marie</p>
            <span className="v-app-pill" style={{ marginTop: 4 }}>TIME TO LIVE</span>
          </div>
        </div>

        <p className="v-app-label">🏅 Mes badges <span style={{ color: "#545049", fontWeight: 400 }}>4/8</span></p>
        <div className="v-badges">
          <div className="v-badge is-on">🔥</div>
          <div className="v-badge is-on">💪</div>
          <div className="v-badge is-on">🥗</div>
          <div className="v-badge is-on">⭐</div>
          <div className="v-badge">🔒</div>
          <div className="v-badge">🔒</div>
        </div>

        <p className="v-app-label">Mes jours d&apos;entraînement</p>
        <div className="v-chips" style={{ flexWrap: "wrap" }}>
          <span className="v-chip is-on">Lun</span>
          <span className="v-chip">Mar</span>
          <span className="v-chip is-on">Mer</span>
          <span className="v-chip">Jeu</span>
          <span className="v-chip is-on">Ven</span>
        </div>

        <div className="v-line" style={{ marginTop: 12 }}>
          <div className="v-line-ico">💳</div>
          <div className="v-line-txt">
            <b>Mon abonnement</b>
            <span>6 000 XPF / mois · actif</span>
          </div>
          <span style={{ fontSize: 10, color: "#545049" }}>›</span>
        </div>
        <div className="v-line">
          <div className="v-line-ico">🔔</div>
          <div className="v-line-txt">
            <b>Notifications</b>
            <span>Rappels de séance</span>
          </div>
          <span style={{ fontSize: 10, color: "#545049" }}>›</span>
        </div>
      </div>

      <BottomNav actif="profil" />
    </div>
  );
}

export const ECRANS = [
  { id: "accueil", titre: "Ton accueil", legende: "Ta mission du jour, en un coup d'œil", Ecran: EcranAccueil },
  { id: "sport", titre: "Sport", legende: "Tes séances vidéo, semaine par semaine", Ecran: EcranSport },
  { id: "alimentation", titre: "Alimentation", legende: "Tes plans et tes recettes", Ecran: EcranAlimentation },
  { id: "profil", titre: "Ton profil", legende: "Badges, rythme et abonnement", Ecran: EcranProfil },
];

export function PhoneMockup({ children, float }: { children: React.ReactNode; float?: boolean }) {
  return (
    <div className={`v-phone${float ? " v-phone-float" : ""}`}>
      <div className="v-phone-notch" />
      {children}
    </div>
  );
}

export { EcranAccueil };
