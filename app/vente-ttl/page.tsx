import Link from "next/link";
import type { Metadata } from "next";
import "./vente-ttl.css";
import { Rail, Faq, RevealOnScroll, VideoYoutube } from "./Interactif";
import { ECRANS, PhoneMockup, EcranAccueil } from "./PhoneScreens";
import { RESULTATS, TEMOIGNAGES, VIDEOS, Courbe } from "./Preuves";

export const metadata: Metadata = {
  title: "Time To Live — l'app qui ne te lâche pas",
  description:
    "Sport, nutrition et motivation dans une seule application. 6 000 XPF par mois, sans engagement.",
};

const MARQUEE = RESULTATS.map((r) => `${r.prenom} −${r.kg} kg`);

const PILIERS = [
  {
    no: "01",
    titre: "Elle te dit quoi faire aujourd'hui",
    texte:
      "Tu ouvres l'app, tu as UNE mission du jour. Pas trente onglets, pas un PDF de 40 pages à trier toute seule.",
  },
  {
    no: "02",
    titre: "Sport et alimentation au même endroit",
    texte:
      "Tes séances vidéo, tes plans alimentaires et tes recettes ne vivent plus dans trois applis différentes. Tout est là.",
  },
  {
    no: "03",
    titre: "Elle te relance quand tu lâches",
    texte:
      "Série de séances, rappels, badges, capsules motivation. Ce qui compte, ce n'est pas la semaine 1 — c'est la semaine 9.",
  },
];

const ETAPES = [
  {
    no: "01",
    titre: "Tu dis où tu vas",
    texte:
      "Perdre du poids, te muscler, retrouver de l'énergie ou installer de bonnes habitudes. L'app se cale sur ton objectif dès l'inscription.",
  },
  {
    no: "02",
    titre: "Tu ouvres, c'est déjà prêt",
    texte:
      "Ton parcours vidéo, ton programme du mois et tes plans alimentaires t'attendent. Rien à construire, rien à chercher.",
  },
  {
    no: "03",
    titre: "Tu avances, elle suit",
    texte:
      "Chaque séance validée nourrit ta série. Tu vois où tu en es, et l'app te remet dedans les jours où l'envie n'y est pas.",
  },
];

const FAQ = [
  {
    q: "C'est un programme sportif ?",
    a: "Non. Time To Live est une application d'accompagnement : elle t'ouvre chaque jour sur une seule chose à faire, te donne tes séances, ton alimentation et de quoi rester motivée. Le sport n'est qu'une partie de ce qu'elle contient.",
  },
  {
    q: "Je suis vraiment débutante, c'est pour moi ?",
    a: "Oui. Le parcours démarre par des vidéos courtes qui expliquent comment tout fonctionne, et les séances se lancent toutes seules : tu suis, tu n'as rien à préparer.",
  },
  {
    q: "Il me faut du matériel ou une salle ?",
    a: "Non. Les séances sont pensées pour être faites chez toi. Si tu as du matériel, tant mieux ; sinon ça fonctionne quand même.",
  },
  {
    q: "Je peux arrêter quand je veux ?",
    a: "Oui. L'abonnement est sans engagement : tu le résilies en un clic depuis ton profil, et tu gardes l'accès jusqu'à la fin du mois déjà payé.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Tu crées ton compte, puis tu paies en ligne par carte via Stripe — le même système qu'utilisent des millions de sites. Ton accès s'ouvre immédiatement après le paiement.",
  },
  {
    q: "Et si je pars en déplacement ou que je tombe malade ?",
    a: "Ta série n'est pas perdue pour un jour manqué : tu as des jokers, et tu reprends là où tu t'étais arrêtée. L'app est faite pour la vraie vie, pas pour une vie parfaite.",
  },
];

export default function VenteTtlPage() {
  return (
    <div className="vttl">
      <RevealOnScroll />

      {/* ---------- NAV ---------- */}
      <nav className="v-nav">
        <div className="v-nav-inner">
          <span className="v-brand">TIME TO <span className="v-flame">LIVE</span></span>
          <div className="v-navlinks">
            <a href="#resultats">Résultats</a>
            <a href="#app">L&apos;app</a>
            <a href="#avis">Avis</a>
            <a href="#offre">Tarif</a>
          </div>
          <Link href="/inscription-ttl" className="v-btn v-btn-primary">Je rejoins</Link>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <header className="v-hero">
        <div className="v-wrap v-hero-grid">
          <div data-reveal>
            <span className="v-eyebrow"><span className="v-dot" /> Sport · Nutrition · Motivation</span>
            <h1>
              L&apos;app qui<br />
              ne te <span className="v-flame">lâche</span><br />
              <span className="v-outline">pas.</span>
            </h1>
            <p className="v-lede">
              Tes séances, ton alimentation et ta motivation au même endroit — avec une seule chose à faire chaque jour. Pas un programme de plus qu&apos;on abandonne en semaine deux.
            </p>
            <div className="v-hero-ctas">
              <Link href="/inscription-ttl" className="v-btn v-btn-primary">Je rejoins Time To Live</Link>
              <a href="#app" className="v-btn v-btn-outline">Voir l&apos;app ↓</a>
            </div>
            <div className="v-hero-stats">
              <div className="v-stat">
                <span className="v-stat-num v-flame">6 000</span>
                <span className="v-stat-lbl">XPF / mois</span>
              </div>
              <div className="v-stat">
                <span className="v-stat-num">4</span>
                <span className="v-stat-lbl">Espaces dans l&apos;app</span>
              </div>
              <div className="v-stat">
                <span className="v-stat-num">0</span>
                <span className="v-stat-lbl">Engagement</span>
              </div>
            </div>
          </div>

          <div data-reveal style={{ display: "flex", justifyContent: "center" }}>
            <PhoneMockup float>
              <EcranAccueil />
            </PhoneMockup>
          </div>
        </div>
      </header>

      {/* ---------- BANDEAU DÉFILANT ---------- */}
      <div className="v-marquee">
        <div className="v-marquee-track">
          {[0, 1].map((copie) => (
            <div key={copie} style={{ display: "flex" }} aria-hidden={copie === 1}>
              {MARQUEE.map((mot) => (
                <span className="v-marquee-item" key={`${copie}-${mot}`}>{mot}<i /></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- RÉSULTATS ---------- */}
      <section className="v-section" id="resultats">
        <div className="v-wrap">
          <Rail
            count={RESULTATS.length}
            label="Résultats clientes"
            head={
              <div className="v-section-head" style={{ marginBottom: 0 }} data-reveal>
                <span className="v-eyebrow"><span className="v-dot" /> Elles l&apos;ont fait avec la Team MJ</span>
                <h2>Des résultats,<br />pas des promesses.</h2>
                <p>Chaque courbe est celle d&apos;une vraie cliente suivie par l&apos;équipe.</p>
              </div>
            }
          >
            {RESULTATS.map((r, i) => (
              <div className="v-result" key={r.prenom + r.kg}>
                <Courbe seed={i} />
                <div className="v-result-kg">−{r.kg}<i>kg</i></div>
                <div className="v-result-who">
                  <strong>{r.prenom}</strong>
                  {r.duree && <span>en {r.duree}</span>}
                </div>
              </div>
            ))}
          </Rail>

          <p className="v-disclaimer" data-reveal>
            Ces résultats ont été obtenus avec l&apos;accompagnement complet Team MJ (plan personnalisé,
            suivi hebdomadaire, visios). <b>Time To Live, c&apos;est cette méthode mise dans une app</b> —
            les résultats dépendent de ton implication.
          </p>
        </div>
      </section>

      {/* ---------- CARROUSEL DES ÉCRANS ---------- */}
      <section className="v-section" id="app">
        <div className="v-wrap">
          <Rail
            count={ECRANS.length}
            label="Écrans de l'application"
            head={
              <div className="v-section-head" style={{ marginBottom: 0 }} data-reveal>
                <span className="v-eyebrow"><span className="v-dot" /> Dans ta poche</span>
                <h2>Voilà exactement<br />ce que tu ouvres<br />chaque matin.</h2>
                <p>Fais glisser pour visiter l&apos;app espace par espace.</p>
              </div>
            }
          >
            {ECRANS.map(({ id, titre, legende, Ecran }) => (
              <div className="v-phone-col" key={id}>
                <PhoneMockup>
                  <Ecran />
                </PhoneMockup>
                <div className="v-phone-caption">
                  <strong>{titre}</strong>
                  <span>{legende}</span>
                </div>
              </div>
            ))}
          </Rail>
        </div>
      </section>

      {/* ---------- PILIERS ---------- */}
      <section className="v-section">
        <div className="v-wrap">
          <div className="v-section-head" data-reveal>
            <span className="v-eyebrow"><span className="v-dot" /> Pourquoi ça tient</span>
            <h2>Ce n&apos;est pas un programme.<br />C&apos;est un rendez-vous quotidien.</h2>
          </div>
          <div className="v-pillars">
            {PILIERS.map((p) => (
              <div className="v-pillar" data-reveal key={p.no}>
                <div className="v-pillar-no">{p.no}</div>
                <h3>{p.titre}</h3>
                <p>{p.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ÉTAPES ---------- */}
      <section className="v-section" id="comment">
        <div className="v-wrap">
          <div className="v-section-head" data-reveal>
            <span className="v-eyebrow"><span className="v-dot" /> Comment ça marche</span>
            <h2>Trois minutes pour<br />commencer.</h2>
            <p>Tu crées ton compte, tu choisis ton objectif, et tout est déjà en place.</p>
          </div>
          <div className="v-steps">
            {ETAPES.map((e) => (
              <div className="v-step" data-reveal key={e.no}>
                <div className="v-step-rail">
                  <div className="v-step-num">{e.no}</div>
                  <div className="v-step-line" />
                </div>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TÉMOIGNAGES ---------- */}
      <section className="v-section" id="avis">
        <div className="v-wrap">
          <Rail
            count={TEMOIGNAGES.length}
            label="Avis"
            head={
              <div className="v-section-head" style={{ marginBottom: 0 }} data-reveal>
                <span className="v-eyebrow"><span className="v-dot" /> Elles en parlent</span>
                <h2>Ce que ça change,<br />dans leurs mots.</h2>
                <p>Des messages reçus par l&apos;équipe, repris tels quels.</p>
              </div>
            }
          >
            {TEMOIGNAGES.map((t) => (
              <div className="v-testi" key={t.prenom + t.meta}>
                <div className="v-quote">“</div>
                <div className="v-stars">★★★★★</div>
                <p>{t.texte}</p>
                <div className="v-testi-who">
                  <div className="v-avatar">{t.prenom.charAt(0)}</div>
                  <div>
                    <span className="v-testi-name">{t.prenom}</span>
                    <span className="v-testi-meta">{t.meta}</span>
                  </div>
                </div>
              </div>
            ))}
          </Rail>
        </div>
      </section>

      {/* ---------- TÉMOIGNAGES VIDÉO ---------- */}
      <section className="v-section" id="videos">
        <div className="v-wrap">
          <Rail
            count={VIDEOS.length}
            label="Témoignages vidéo"
            head={
              <div className="v-section-head" style={{ marginBottom: 0 }} data-reveal>
                <span className="v-eyebrow"><span className="v-dot" /> En vidéo</span>
                <h2>Elles le racontent<br />elles-mêmes.</h2>
                <p>Quatre clientes ont pris la parole face caméra, sans script.</p>
              </div>
            }
          >
            {VIDEOS.map((v) => (
              <VideoYoutube key={v.id} id={v.id} prenom={v.prenom} resultat={v.resultat} />
            ))}
          </Rail>
        </div>
      </section>

      {/* ---------- OFFRE ---------- */}
      <section className="v-section" id="offre">
        <div className="v-wrap v-offer">
          <div data-reveal>
            <span className="v-eyebrow" style={{ marginBottom: 16 }}><span className="v-dot" /> Ce que tu as dedans</span>
            <h2 style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", lineHeight: 0.94, letterSpacing: "2px", margin: "0 0 26px" }}>
              Un seul accès.<br />Tout est dedans.
            </h2>
            <ul className="v-incl">
              <li>
                <span className="v-check">✓</span>
                <p style={{ margin: 0 }}><strong>Ton parcours de démarrage</strong><span>Des vidéos courtes, dans l&apos;ordre, pour ne pas partir dans tous les sens.</span></p>
              </li>
              <li>
                <span className="v-check">✓</span>
                <p style={{ margin: 0 }}><strong>Tes séances vidéo</strong><span>Un programme par mois, semaine par semaine, à faire chez toi.</span></p>
              </li>
              <li>
                <span className="v-check">✓</span>
                <p style={{ margin: 0 }}><strong>Plans alimentaires & recettes</strong><span>Des plans selon tes calories et des recettes classées par catégorie.</span></p>
              </li>
              <li>
                <span className="v-check">✓</span>
                <p style={{ margin: 0 }}><strong>Capsules motivation</strong><span>De quoi te remettre dedans les jours sans, plus badges et série de séances.</span></p>
              </li>
              <li>
                <span className="v-check">✓</span>
                <p style={{ margin: 0 }}><strong>Les nouveautés incluses</strong><span>Chaque mois, de nouveaux contenus arrivent sans supplément.</span></p>
              </li>
            </ul>
          </div>

          <div data-reveal>
            <div className="v-price-card">
              <span className="v-price-pill">Sans engagement</span>
              <h3>Time To Live</h3>
              <p className="v-price-sub">Accès complet à l&apos;application.</p>
              <div className="v-price-amount">
                <b className="v-flame">6 000</b>
                <i>XPF / mois</i>
              </div>
              <p className="v-price-note">Soit environ 200 XPF par jour.</p>
              <ul className="v-price-feats">
                <li><em>✓</em> Accès à tous les espaces de l&apos;app</li>
                <li><em>✓</em> Nouveaux contenus chaque mois</li>
                <li><em>✓</em> Paiement sécurisé par carte</li>
                <li><em>✓</em> Résiliable en un clic, à tout moment</li>
              </ul>
              <Link href="/inscription-ttl" className="v-btn v-btn-primary">Je rejoins Time To Live</Link>
              <p className="v-price-legal">Ton accès s&apos;ouvre dès le paiement validé.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="v-section">
        <div className="v-wrap">
          <div className="v-section-head v-center" data-reveal>
            <span className="v-eyebrow"><span className="v-dot" /> Questions</span>
            <h2>Ce qu&apos;on nous demande<br />le plus souvent.</h2>
          </div>
          <div data-reveal>
            <Faq items={FAQ} />
          </div>
        </div>
      </section>

      {/* ---------- CTA FINALE ---------- */}
      <section className="v-final">
        <div className="v-wrap" data-reveal>
          <h2>
            Le bon moment,<br />
            <span className="v-flame">c&apos;est maintenant.</span>
          </h2>
          <p>Trois minutes pour créer ton compte. Et demain matin, tu sais déjà quoi faire.</p>
          <Link href="/inscription-ttl" className="v-btn v-btn-primary">Je rejoins Time To Live</Link>
        </div>
      </section>

      {/* ---------- PIED DE PAGE ---------- */}
      <footer className="v-footer">
        <div className="v-wrap v-footer-top">
          <span className="v-brand">TIME TO <span className="v-flame">LIVE</span></span>
          <Link href="/login">Déjà un compte ? Se connecter</Link>
        </div>
        <div className="v-footer-bar" />
      </footer>

      {/* barre collante sur téléphone */}
      <div className="v-sticky-cta">
        <div>
          <span className="v-sticky-lbl">Sans engagement</span>
          <span className="v-sticky-price v-flame">6 000 XPF / mois</span>
        </div>
        <Link href="/inscription-ttl" className="v-btn v-btn-primary">Je rejoins</Link>
      </div>
    </div>
  );
}
