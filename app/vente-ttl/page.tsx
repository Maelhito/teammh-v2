import Link from "next/link";
import "./vente-ttl.css";
import RevealOnScroll from "./RevealOnScroll";

const VALEURS = [
  { mark: "01", titre: "UN PROGRAMME GUIDÉ, PAS UN PDF", texte: "Onboarding vidéo, séances qui se lancent toutes seules — tout est expliqué, pas à toi de deviner." },
  { mark: "02", titre: "SPORT + NUTRITION, ENSEMBLE", texte: "Séances vidéo et plans alimentaires avec recettes, dans la même application." },
  { mark: "03", titre: "FAIT POUR TENIR DANS LA DURÉE", texte: "Série de séances, jokers et capsules motivation — pour ne pas lâcher après deux semaines." },
];

const ETAPES = [
  { no: "ÉTAPE 01", emoji: "🎯", titre: "TU CHOISIS TON OBJECTIF", texte: "Perdre du poids, te muscler, retrouver de l'énergie, de bonnes habitudes — l'app s'adapte à toi." },
  { no: "ÉTAPE 02", emoji: "🎬", titre: "TU DÉMARRES TON PROGRAMME", texte: "Onboarding vidéo, ton programme sport et ton plan alimentaire sont prêts dès le premier jour." },
  { no: "ÉTAPE 03", emoji: "🔥", titre: "TU TIENS DANS LA DURÉE", texte: "Séances qui se lancent seules, série à ne pas casser, capsules motivation pour rester dedans." },
];

export default function VenteTtlPage() {
  return (
    <div className="vttl">
      <RevealOnScroll />

      <nav className="v-nav">
        <div className="v-nav-inner">
          <div className="v-brand">
            <strong className="font-title">TIME TO <span>LIVE</span></strong>
          </div>
          <div className="v-navlinks">
            <a href="#programme">Le programme</a>
            <a href="#offre">Tarif</a>
          </div>
          <a href="#offre" className="v-btn v-btn-primary font-title">Je démarre</a>
        </div>
      </nav>

      <header className="v-hero">
        <div className="v-wrap v-hero-grid">
          <div data-reveal>
            <span className="v-eyebrow"><span className="v-dot" /> Sport &amp; nutrition, dans une seule app</span>
            <h1 className="font-title">
              Le déclic que tu<br />remets <span>depuis</span><br />trop longtemps.
            </h1>
            <p className="v-lede">
              Un programme sport et nutrition complet, pensé pour tenir dans la durée — pas juste jusqu&apos;à la deuxième semaine.
            </p>
            <div className="v-hero-ctas">
              <Link href="/inscription-ttl" className="v-btn v-btn-primary font-title">Je démarre mon programme</Link>
              <a href="#programme" className="v-btn v-btn-ghost font-title">Comment ça marche ↓</a>
            </div>
          </div>

          <div data-reveal>
            <div className="v-phone-frame">
              <span className="v-phone-tag">Time To Live</span>
              <div className="v-notch" />
              <div className="v-row v-tall v-accent" />
              <div className="v-row" />
              <div className="v-row" />
            </div>
          </div>
        </div>
      </header>

      <section className="v-section">
        <div className="v-wrap">
          <div className="v-value-grid">
            {VALEURS.map((v) => (
              <div className="v-value-item" data-reveal key={v.mark}>
                <div className="v-mark font-title">{v.mark}</div>
                <h3 className="font-title">{v.titre}</h3>
                <p>{v.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="v-section" id="programme">
        <div className="v-wrap">
          <div className="v-section-head" data-reveal>
            <span className="v-eyebrow"><span className="v-dot" /> Comment ça marche</span>
            <h2 className="font-title"><span className="v-accent-bar" />Trois étapes pour démarrer.</h2>
            <p>Une seule décision à prendre — le reste est déjà prêt dans l&apos;application.</p>
          </div>

          <div className="v-steps">
            {ETAPES.map((e) => (
              <div className="v-step" data-reveal key={e.no}>
                <div className="v-step-no font-title">{e.no}</div>
                <div className="v-step-emoji">{e.emoji}</div>
                <h3 className="font-title">{e.titre}</h3>
                <p>{e.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="v-section" id="offre">
        <div className="v-wrap v-offer-wrap">
          <div data-reveal>
            <span className="v-eyebrow" style={{ marginBottom: 16 }}><span className="v-dot" /> L&apos;offre</span>
            <h2 className="font-title" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.5rem)", letterSpacing: "3px", margin: "0 0 20px" }}>
              <span className="v-accent-bar" />Time To Live — tout inclus.
            </h2>
            <ul className="v-offer-list">
              <li><span className="v-arrow">→</span><p><strong className="font-title">ONBOARDING GUIDÉ</strong><span>Des vidéos courtes pour démarrer du bon pied, dans l&apos;ordre.</span></p></li>
              <li><span className="v-arrow">→</span><p><strong className="font-title">UN PROGRAMME SPORT</strong><span>Des séances vidéo à suivre chez toi, qui se lancent toutes seules.</span></p></li>
              <li><span className="v-arrow">→</span><p><strong className="font-title">NUTRITION</strong><span>Des plans alimentaires et des recettes classées, adaptés à ton objectif.</span></p></li>
              <li><span className="v-arrow">→</span><p><strong className="font-title">CAPSULES MOTIVATION</strong><span>De quoi tenir dans la durée, pas juste les premières semaines.</span></p></li>
            </ul>
          </div>

          <div data-reveal>
            <div className="v-price-card">
              <span className="v-pill font-title">Sans engagement</span>
              <h3 className="font-title">TIME TO LIVE</h3>
              <p className="v-sub">Accès complet à l&apos;application.</p>
              <div className="v-price-row">
                <span className="v-amount font-title">6 000</span>
                <span className="v-per">XPF / mois</span>
              </div>
              <p className="v-price-note">Résiliable à tout moment depuis l&apos;app.</p>
              <ul className="v-price-feats">
                <li><span className="v-arrow">→</span>Onboarding, sport, nutrition, motivation</li>
                <li><span className="v-arrow">→</span>Accès complet à l&apos;application</li>
                <li><span className="v-arrow">→</span>Paiement sécurisé, résiliable en un clic</li>
              </ul>
              <Link href="/inscription-ttl" className="v-btn v-btn-primary font-title">Je m&apos;inscris</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="v-final-cta">
        <div className="v-wrap v-final-cta-inner">
          <div data-reveal>
            <h2 className="font-title">Le meilleur moment<br />pour <span>commencer</span>, c&apos;est celui-ci.</h2>
            <p>Un programme complet, une application pour ne rien perdre en route.</p>
          </div>
          <Link href="/inscription-ttl" className="v-btn v-btn-primary font-title" data-reveal>Je démarre mon programme</Link>
        </div>
      </section>

      <footer className="v-footer">
        <div className="v-wrap v-footer-top">
          <div className="v-brand">
            <strong className="font-title">TIME TO <span style={{ color: "#B22222" }}>LIVE</span></strong>
          </div>
          <Link href="/login" className="v-footer-link">Déjà un compte ? Se connecter</Link>
        </div>
        <div className="v-footer-bar" />
      </footer>
    </div>
  );
}
