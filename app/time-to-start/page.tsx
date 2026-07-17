import type { Metadata } from "next";
import Image from "next/image";
import FaqAccordion from "./FaqAccordion";
import PhoneShowcase from "./PhoneShowcase";
import StickyCta from "./StickyCta";
import SignupButton from "./SignupButton";
import YoutubeTestimonial from "./YoutubeTestimonial";
import { VIDEO_TESTIMONIALS, QUOTE_TESTIMONIALS } from "./testimonials";

export const metadata: Metadata = {
  title: "Time To Start, retrouve ton énergie à ton rythme",
  description:
    "3 séances courtes par semaine, des recettes simples, un vrai coach derrière toi. Sans engagement, à 4 900 XPF/mois.",
};

export default function TimeToStartPage() {
  return (
    <div className="tts-page font-body">
      <nav className="tts-nav">
        <div className="tts-wrap tts-nav-inner">
          <div className="tts-brandmark font-title">
            TIME TO <span>START</span>
          </div>
          <a
            href="#offre"
            id="cta-nav"
            data-event="tts_cta_nav_click"
            className="tts-btn tts-btn-primary tts-btn-sm"
          >
            Je démarre
          </a>
        </div>
      </nav>

      {/* 1. HERO */}
      <header className="tts-hero" id="tts-hero">
        <div className="tts-wrap tts-hero-grid">
          <div>
            <span className="tts-eyebrow">
              <span className="tts-dot" />
              Coaching sport &amp; nutrition en ligne
            </span>
            <h1 className="font-title">
              Tu te dis « lundi, je m&apos;y mets » depuis combien de lundis, déjà ?
            </h1>
            <p className="tts-lede">
              Time To Start, c&apos;est 3 séances courtes par semaine, des recettes simples et un
              vrai coach derrière toi, pour retrouver ton énergie. Sans engagement sur 40 000
              XPF, sans bouleverser ta vie du jour au lendemain.
            </p>
            <div className="tts-hero-ctas">
              <a
                href="#offre"
                id="cta-hero"
                data-event="tts_cta_hero_click"
                className="tts-btn tts-btn-primary"
              >
                Je démarre pour 4 900F/mois
              </a>
            </div>
            <p className="tts-hero-proof">
              Créé par Mael et Julie, coachs à Nouméa. Julie coache depuis 4 ans. Ensemble, on a
              déjà accompagné plus de 90 mamans avec Time To Move.
            </p>
          </div>

          <div className="tts-hero-photo">
            <span className="tts-photo-tag">Mael &amp; Julie</span>
            <Image
              src="/time-to-start/hero/mael-julie.png"
              alt="Mael et Julie, coachs Time To Move"
              width={1456}
              height={960}
              priority
              sizes="(max-width: 880px) 90vw, 440px"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </div>
      </header>

      {/* 2. LE PROBLÈME */}
      <section className="tts-section">
        <div className="tts-wrap tts-narrow">
          <p className="tts-big-line">
            Le matin, tu te dis que ce soir, tu vas enfin bouger.
          </p>
          <p className="tts-big-line">
            Le soir, il reste le repas à préparer, les devoirs, une lessive, et l&apos;énergie est
            à zéro.
          </p>
          <p className="tts-big-line">
            Tu as déjà essayé. Une appli téléchargée puis oubliée. Une salle de sport où tu
            n&apos;as mis les pieds que deux fois. Un régime tenu quinze jours.
          </p>
          <p className="tts-big-line tts-accent-line">
            Ce n&apos;est pas un manque de volonté. C&apos;est que rien n&apos;a été pensé pour
            ton emploi du temps, ni pour ton budget.
          </p>
        </div>
      </section>

      {/* 3. AGITATION DOUCE */}
      <section className="tts-section tts-section-alt">
        <div className="tts-wrap tts-narrow">
          <p className="tts-big-line">
            YouTube te propose mille vidéos différentes, sans savoir où tu en es.
          </p>
          <p className="tts-big-line">
            Les applis génériques te donnent un programme identique à des milliers de personnes,
            jamais adapté à tes journées.
          </p>
          <p className="tts-big-line">
            La motivation du 1er janvier retombe toujours à la même date, parce qu&apos;elle ne
            s&apos;appuie sur rien de concret.
          </p>
          <p className="tts-big-line tts-accent-line">
            Ce qui te manque, ce n&apos;est pas plus de discipline. C&apos;est un cadre simple,
            avec quelqu&apos;un derrière, qui tient dans la durée.
          </p>
        </div>
      </section>

      {/* 4. LA SOLUTION */}
      <section className="tts-section" id="programme">
        <div className="tts-wrap">
          <div className="tts-section-head tts-narrow">
            <span className="tts-eyebrow">
              <span className="tts-dot" />
              La méthode
            </span>
            <h2 className="font-title">
              <span className="tts-accent-bar" />
              Time To Start n&apos;est pas une version allégée.
            </h2>
            <p>
              C&apos;est un point de départ pensé pour toi : commencer maintenant, à ton rythme,
              sans pression. On l&apos;appelle la Méthode Étincelle. Trois actions simples chaque
              semaine, assez légères pour être tenues, assez régulières pour créer un vrai
              mouvement.
            </p>
          </div>

          <div className="tts-pillars">
            <div className="tts-pillar">
              <div className="tts-pillar-mark">01</div>
              <h3 className="font-title">Séances vidéo</h3>
              <p>30 à 45 minutes, 3 fois par semaine, à faire chez toi.</p>
            </div>
            <div className="tts-pillar">
              <div className="tts-pillar-mark">02</div>
              <h3 className="font-title">Recettes simples</h3>
              <p>Rapides à préparer, adaptées à ton quotidien et ton budget.</p>
            </div>
            <div className="tts-pillar">
              <div className="tts-pillar-mark">03</div>
              <h3 className="font-title">Live mensuel &amp; communauté</h3>
              <p>Motivation collective, questions posées directement à ton coach.</p>
            </div>
          </div>

          <div className="tts-community">
            <Image
              src="/time-to-start/community/hike.jpg"
              alt="La communauté Time To Move lors d'une sortie de groupe"
              width={1600}
              height={1200}
              sizes="(max-width: 880px) 100vw, 1120px"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <p className="tts-community-caption">La communauté Time To Move, en vrai.</p>
          </div>
        </div>
      </section>

      {/* 5. DÉMONSTRATION */}
      <section className="tts-section tts-section-alt">
        <div className="tts-wrap">
          <div className="tts-section-head tts-narrow">
            <span className="tts-eyebrow">
              <span className="tts-dot" />
              Dans l&apos;application
            </span>
            <h2 className="font-title">
              <span className="tts-accent-bar" />
              Ce n&apos;est pas une promesse en l&apos;air.
            </h2>
            <p>
              Voici exactement ce que tu retrouves dans l&apos;application, dès ton premier
              jour.
            </p>
          </div>

          <PhoneShowcase />
        </div>
      </section>

      {/* 6. PREUVE SOCIALE */}
      <section className="tts-section" id="temoignages">
        <div className="tts-wrap">
          <div className="tts-section-head tts-narrow">
            <span className="tts-eyebrow">
              <span className="tts-dot" />
              Elles ont commencé
            </span>
            <h2 className="font-title">
              <span className="tts-accent-bar" />
              Ce que ça change, dans leurs mots.
            </h2>
            <p>Témoignages de clientes de notre programme accompagné Time To Move.</p>
          </div>

          <div className="tts-testi-grid">
            {VIDEO_TESTIMONIALS.map((t) => (
              <YoutubeTestimonial
                key={t.prenom}
                prenom={t.prenom}
                youtubeUrl={t.youtubeUrl}
                featured={t.featured}
              />
            ))}
            {QUOTE_TESTIMONIALS.map((t) => (
              <div className="tts-testi-card" key={t.prenom}>
                <div className="tts-testi-photo-row">
                  <div className="tts-testi-avatar" />
                </div>
                <div className="tts-testi-body">
                  <p className="tts-testi-quote">&laquo; {t.quote} &raquo;</p>
                  <p className="tts-testi-name font-title">{t.prenom}</p>
                  <p className="tts-testi-source">Cliente Time To Move</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. COMPARAISON */}
      <section className="tts-section tts-section-alt">
        <div className="tts-wrap tts-narrow">
          <div className="tts-section-head">
            <span className="tts-eyebrow">
              <span className="tts-dot" />
              Deux façons d&apos;avancer
            </span>
            <h2 className="font-title">
              <span className="tts-accent-bar" />
              Time To Start, Time To Move.
            </h2>
          </div>

          <div className="tts-compare">
            <div className="tts-compare-col">
              <h3 className="font-title">Time To Start</h3>
              <p className="tts-compare-price">4 900F/mois</p>
              <ul>
                <li>Autonomie, format léger</li>
                <li>Sans engagement</li>
                <li>Séances, recettes, live mensuel</li>
              </ul>
            </div>
            <div className="tts-compare-col tts-compare-col-highlight">
              <h3 className="font-title">Time To Move</h3>
              <p className="tts-compare-price">40 000F/mois</p>
              <ul>
                <li>Coaching complet</li>
                <li>Accompagnement humain sur mesure</li>
                <li>Programme ajusté chaque semaine</li>
              </ul>
            </div>
          </div>

          <p className="tts-compare-note">
            Time To Start, c&apos;est le meilleur moyen de reprendre le mouvement par toi-même.
            Le jour où tu voudras un accompagnement complet, avec un coach qui ajuste ton
            programme chaque semaine, Time To Move t&apos;attend.
          </p>
        </div>
      </section>

      {/* 8. OFFRE */}
      <section className="tts-section" id="offre">
        <div className="tts-wrap tts-narrow">
          <div className="tts-price-card">
            <span className="tts-pill">Prix fondateur</span>
            <h2 className="font-title">Time To Start</h2>
            <div className="tts-price-row">
              <span className="tts-price-old">5 900F</span>
              <span className="tts-price-amount font-title">4 900F</span>
              <span className="tts-price-per">/ mois</span>
            </div>
            <p className="tts-price-note">Bloqué à vie si tu rejoins maintenant.</p>

            <ul className="tts-price-feats">
              <li>
                <span className="tts-check">✓</span>Accès complet à l&apos;application
              </li>
              <li>
                <span className="tts-check">✓</span>Nouvelles séances chaque semaine
              </li>
              <li>
                <span className="tts-check">✓</span>Recettes et plans repas
              </li>
              <li>
                <span className="tts-check">✓</span>Live mensuel avec ton coach
              </li>
              <li>
                <span className="tts-check">✓</span>Accès communauté
              </li>
              <li>
                <span className="tts-check">✓</span>Résiliable en 2 clics, à tout moment
              </li>
            </ul>

            <SignupButton id="cta-price-card" label="Je m'inscris à 4 900F/mois" />
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="tts-section tts-section-alt" id="faq">
        <div className="tts-wrap tts-narrow">
          <div className="tts-section-head">
            <span className="tts-eyebrow">
              <span className="tts-dot" />
              Tes questions
            </span>
            <h2 className="font-title">
              <span className="tts-accent-bar" />
              Avant de te lancer.
            </h2>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* 10. URGENCE FINALE + CTA */}
      <section className="tts-final-cta">
        <div className="tts-wrap tts-narrow">
          <h2 className="font-title">
            Le prix fondateur à 4 900F/mois, bloqué à vie, c&apos;est maintenant ou jamais.
          </h2>
          <SignupButton id="cta-final" label="Je commence maintenant à 4 900F" />
          <p className="tts-reassurance">
            Paiement sécurisé · Résiliable en 2 clics · Pas d&apos;engagement
          </p>
        </div>
      </section>

      <footer className="tts-footer">
        <div className="tts-wrap tts-footer-inner">
          <div className="tts-brandmark font-title tts-footer-brand">
            TIME TO <span>START</span>
          </div>
          <div className="tts-footer-links">
            <a href="#">Instagram</a>
            <a href="#">WhatsApp</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <div className="tts-footer-bar" />
      </footer>

      <StickyCta />

      <style>{`
        .tts-page { background: var(--noir); color: var(--blanc); overflow-x: hidden; }
        .tts-wrap { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
        .tts-narrow { max-width: 720px; }

        .tts-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--text-muted); font-weight: 500; margin-bottom: 16px; }
        .tts-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rouge); flex-shrink: 0; }
        .tts-accent-bar { display: inline-block; width: 3px; height: 18px; background: var(--rouge); margin-right: 10px; vertical-align: -3px; }

        .tts-btn { font-family: var(--font-title), sans-serif; letter-spacing: 3px; font-size: 15px; text-transform: uppercase; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; border: 2px solid var(--rouge); transition: transform 0.15s ease, background 0.15s ease; }
        .tts-btn:active { transform: scale(0.97); }
        .tts-btn-primary { background: var(--rouge); color: var(--blanc); padding: 13px 26px; border-radius: 8px; }
        .tts-btn-primary:hover { background: #8B0000; border-color: #8B0000; }
        .tts-btn-sm { padding: 9px 18px; font-size: 13px; }
        .tts-btn-block { width: 100%; }

        /* Nav */
        .tts-nav { position: sticky; top: 0; z-index: 40; background: rgba(13,13,13,0.86); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
        .tts-nav-inner { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .tts-brandmark { font-size: 1.15rem; letter-spacing: 4px; text-transform: uppercase; }
        .tts-brandmark span { color: var(--rouge); }

        /* Hero */
        .tts-hero { padding: 64px 0 88px; border-bottom: 1px solid var(--border); position: relative; overflow: hidden; }
        .tts-hero::before { content: ""; position: absolute; inset: -10% -20% -30% 55%; background: repeating-linear-gradient(-32deg, rgba(178,34,34,0.07) 0px, rgba(178,34,34,0.07) 2px, transparent 2px, transparent 46px); pointer-events: none; }
        .tts-hero-grid { position: relative; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; }
        .tts-hero h1 { font-size: clamp(1.9rem, 5vw, 3.2rem); line-height: 1.03; letter-spacing: 2px; margin: 0 0 20px; text-transform: none; }
        .tts-lede { font-size: 1rem; color: #9a9a9a; max-width: 460px; margin: 0 0 26px; font-weight: 300; }
        .tts-hero-ctas { margin-bottom: 22px; }
        .tts-hero-proof { font-size: 0.82rem; color: var(--text-muted); max-width: 440px; }

        .tts-hero-photo { position: relative; }
        .tts-photo-tag { position: absolute; top: -14px; left: 16px; z-index: 2; font-family: var(--font-title), sans-serif; font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; background: var(--noir); border: 1px solid var(--border); padding: 6px 12px; color: var(--text-muted); }

        @media (max-width: 880px) {
          .tts-hero-grid { grid-template-columns: 1fr; }
          .tts-hero-photo { order: -1; max-width: 240px; margin: 0 auto 12px; }
        }

        /* Sections */
        .tts-section { padding: 72px 0; border-bottom: 1px solid var(--border); }
        .tts-section-alt { background: #111111; }
        .tts-section-head { margin-bottom: 44px; }
        .tts-section-head h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); letter-spacing: 2px; margin: 0 0 14px; text-transform: none; }
        .tts-section-head p { color: #9a9a9a; font-size: 0.95rem; font-weight: 300; margin: 0; }

        .tts-big-line { font-size: clamp(1.1rem, 2.6vw, 1.5rem); line-height: 1.5; margin: 0 0 20px; color: #cfcfcf; font-weight: 300; }
        .tts-accent-line { color: var(--blanc); font-weight: 500; }

        /* Pillars */
        .tts-pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); }
        @media (max-width: 780px) { .tts-pillars { grid-template-columns: 1fr; } }
        .tts-pillar { background: var(--noir); padding: 30px 26px; }
        .tts-pillar-mark { font-family: var(--font-title), sans-serif; font-size: 1.8rem; color: var(--rouge); margin-bottom: 12px; }
        .tts-pillar h3 { font-size: 1.05rem; letter-spacing: 1.5px; margin: 0 0 8px; text-transform: uppercase; }
        .tts-pillar p { color: #9a9a9a; font-size: 0.88rem; margin: 0; font-weight: 300; }
        .tts-community { margin-top: 32px; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
        .tts-community-caption { margin: 0; padding: 14px 18px; font-size: 0.82rem; color: var(--text-muted); background: #111111; }

        /* Showcase / phone carousel */
        .tts-showcase { display: flex; flex-direction: column; align-items: center; gap: 18px; }
        .tts-showcase-phone { width: 100%; max-width: 280px; aspect-ratio: 962/1466; background: #0a0a0a; border: 6px solid #000; border-radius: 22px; position: relative; padding: 10px; touch-action: pan-y; }
        .tts-showcase-notch { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 40%; height: 14px; background: #000; border-radius: 0 0 10px 10px; z-index: 2; }
        .tts-showcase-screen { height: 100%; border-radius: 14px; background: #111111; position: relative; overflow: hidden; }
        .tts-showcase-controls { display: flex; align-items: center; gap: 18px; }
        .tts-showcase-arrow { background: none; border: 1px solid var(--border); color: var(--blanc); width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; line-height: 1; }
        .tts-showcase-label { font-size: 0.85rem; color: #9a9a9a; min-width: 180px; text-align: center; }
        .tts-showcase-dots { display: flex; gap: 8px; }
        .tts-showcase-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); border: none; cursor: pointer; padding: 0; }
        .tts-showcase-dot.is-active { background: var(--rouge); }

        /* Testimonials */
        .tts-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); }
        @media (max-width: 980px) { .tts-testi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 620px) { .tts-testi-grid { grid-template-columns: 1fr; } }
        .tts-testi-card { background: #111111; }
        .tts-testi-featured { grid-column: span 2; grid-row: span 2; }
        @media (max-width: 620px) { .tts-testi-featured { grid-column: span 1; } }
        .tts-testi-video { aspect-ratio: 4/5; background: #0a0a0a; position: relative; border-bottom: 1px solid var(--border); overflow: hidden; }
        .tts-testi-featured .tts-testi-video { aspect-ratio: 16/10; }
        .tts-testi-play-trigger { position: absolute; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 0; }
        .tts-ph-tag { position: absolute; top: 12px; left: 12px; font-family: var(--font-title), sans-serif; font-size: 0.65rem; letter-spacing: 1.5px; text-transform: uppercase; border: 1px solid var(--border); color: var(--text-muted); padding: 4px 9px; z-index: 1; }
        .tts-play-btn { width: 46px; height: 46px; border-radius: 50%; background: var(--rouge); display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
        .tts-play-btn svg { width: 16px; height: 16px; margin-left: 2px; }
        .tts-testi-photo-row { padding: 20px 18px 0; }
        .tts-testi-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--gris); border: 2px solid var(--rouge); }
        .tts-testi-body { padding: 16px 18px 20px; }
        .tts-testi-quote { font-size: 0.85rem; color: #cfcfcf; font-weight: 300; margin: 0 0 12px; line-height: 1.5; }
        .tts-testi-name { font-size: 0.92rem; letter-spacing: 1.2px; margin: 0; }
        .tts-testi-source { font-size: 0.72rem; color: var(--text-muted); margin: 3px 0 0; }

        /* Compare */
        .tts-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 26px; }
        @media (max-width: 620px) { .tts-compare { grid-template-columns: 1fr; } }
        .tts-compare-col { border: 1px solid var(--border); border-radius: 4px; padding: 24px 22px; }
        .tts-compare-col-highlight { border-color: var(--rouge); }
        .tts-compare-col h3 { font-size: 1.1rem; letter-spacing: 1.5px; margin: 0 0 6px; }
        .tts-compare-price { font-family: var(--font-title), sans-serif; font-size: 1.3rem; color: var(--rouge); margin: 0 0 16px; }
        .tts-compare-col ul { margin: 0; padding: 0 0 0 18px; }
        .tts-compare-col li { font-size: 0.85rem; color: #cfcfcf; margin-bottom: 8px; font-weight: 300; }
        .tts-compare-note { color: #9a9a9a; font-size: 0.9rem; font-weight: 300; margin: 0; }

        /* Price card */
        .tts-price-card { border: 1px solid var(--border); border-radius: 4px; padding: 36px 30px; position: relative; }
        .tts-price-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: var(--rouge); }
        .tts-pill { display: inline-block; font-family: var(--font-title), sans-serif; font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; color: var(--rouge); border: 1px solid var(--rouge); padding: 5px 12px; border-radius: 100px; margin-bottom: 18px; }
        .tts-price-card h2 { font-size: 1.4rem; letter-spacing: 2px; margin: 0 0 16px; }
        .tts-price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
        .tts-price-old { color: var(--text-muted); text-decoration: line-through; font-size: 1.1rem; }
        .tts-price-amount { font-size: 2.2rem; letter-spacing: 1px; }
        .tts-price-per { color: #9a9a9a; font-size: 0.85rem; }
        .tts-price-note { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 24px; }
        .tts-price-feats { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 12px; }
        .tts-price-feats li { display: flex; gap: 10px; font-size: 0.88rem; color: #cfcfcf; font-weight: 300; }
        .tts-check { color: var(--rouge); font-weight: 700; }
        .tts-signup-confirm { color: var(--rouge); font-size: 0.92rem; text-align: center; margin: 0; padding: 14px 0; }

        /* FAQ */
        .tts-faq-list { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); }
        .tts-faq-item { background: var(--noir); }
        .tts-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; background: none; border: none; color: var(--blanc); font-size: 0.92rem; text-align: left; cursor: pointer; font-family: var(--font-body), sans-serif; }
        .tts-faq-icon { color: var(--rouge); font-size: 1.3rem; flex-shrink: 0; line-height: 1; }
        .tts-faq-a { margin: 0; padding: 0 20px 20px; color: #9a9a9a; font-size: 0.88rem; font-weight: 300; line-height: 1.6; }

        /* Final CTA */
        .tts-final-cta { padding: 80px 0; text-align: center; }
        .tts-final-cta h2 { font-size: clamp(1.5rem, 3.4vw, 2.2rem); letter-spacing: 2px; margin: 0 0 28px; text-transform: none; }
        .tts-reassurance { font-size: 0.78rem; color: var(--text-muted); margin: 16px 0 0; }

        /* Footer */
        .tts-footer { padding: 36px 0 0; }
        .tts-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding-bottom: 28px; }
        .tts-footer-brand { font-size: 0.95rem; letter-spacing: 3px; }
        .tts-footer-links { display: flex; gap: 20px; font-size: 0.78rem; color: var(--text-muted); }
        .tts-footer-links a { text-decoration: none; color: inherit; }
        .tts-footer-bar { height: 4px; background: var(--rouge); }

        /* Sticky mobile CTA */
        .tts-sticky-cta { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: rgba(13,13,13,0.94); backdrop-filter: blur(8px); border-top: 1px solid var(--border); transform: translateY(100%); transition: transform 0.25s ease; display: none; }
        .tts-sticky-cta.is-visible { transform: translateY(0); }
        .tts-sticky-cta .tts-btn { width: 100%; }
        @media (max-width: 720px) { .tts-sticky-cta { display: block; } }
      `}</style>
    </div>
  );
}
