"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Carrousel horizontal : flèches, points, et glisser-déposer à la souris.
 * Sur téléphone c'est le défilement natif qui fait le travail (scroll-snap),
 * on ne détourne rien.
 */
export function Rail({
  children,
  count,
  label,
  head,
}: {
  children: React.ReactNode;
  count: number;
  label: string;
  head?: React.ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function pasDeDefilement() {
    const rail = railRef.current;
    if (!rail) return 0;
    const premier = rail.firstElementChild as HTMLElement | null;
    if (!premier) return rail.clientWidth;
    const styles = getComputedStyle(rail);
    return premier.offsetWidth + parseFloat(styles.columnGap || styles.gap || "0");
  }

  function versIndex(i: number) {
    const rail = railRef.current;
    if (!rail) return;
    const cible = Math.max(0, Math.min(count - 1, i));
    rail.scrollTo({ left: cible * pasDeDefilement(), behavior: "smooth" });
  }

  // L'index affiché suit le défilement réel (doigt, molette ou flèches).
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const pas = pasDeDefilement();
        if (pas > 0) setIndex(Math.round(rail!.scrollLeft / pas));
      });
    }
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      rail.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Glisser à la souris — sur ordinateur, on ne peut pas "swiper".
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let actif = false;
    let departX = 0;
    let departScroll = 0;

    function down(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      actif = true;
      departX = e.clientX;
      departScroll = rail!.scrollLeft;
      rail!.classList.add("v-dragging");
    }
    function move(e: PointerEvent) {
      if (!actif) return;
      e.preventDefault();
      rail!.scrollLeft = departScroll - (e.clientX - departX);
    }
    function up() {
      if (!actif) return;
      actif = false;
      rail!.classList.remove("v-dragging");
      const pas = pasDeDefilement();
      if (pas > 0) rail!.scrollTo({ left: Math.round(rail!.scrollLeft / pas) * pas, behavior: "smooth" });
    }

    rail.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      rail.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <>
      <div className="v-carousel-head">
        {head}
        <div className="v-arrows">
          <button className="v-arrow-btn" onClick={() => versIndex(index - 1)} aria-label={`${label} — précédent`}>‹</button>
          <button className="v-arrow-btn" onClick={() => versIndex(index + 1)} aria-label={`${label} — suivant`}>›</button>
        </div>
      </div>
      <div className="v-rail" ref={railRef}>{children}</div>
      <div className="v-dots">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            className={`v-dot-btn${i === index ? " is-active" : ""}`}
            onClick={() => versIndex(i)}
            aria-label={`${label} — élément ${i + 1}`}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Vignette YouTube cliquable. Tant qu'on n'a pas cliqué, rien de YouTube n'est
 * chargé (ni iframe, ni scripts, ni cookies) : la page reste légère et on
 * n'impose pas de traceur à quelqu'un qui ne regarde aucune vidéo.
 */
export function VideoYoutube({ id, prenom, resultat }: { id: string; prenom: string; resultat: string }) {
  const [lance, setLance] = useState(false);

  return (
    <div className="v-video">
      <div className="v-video-thumb">
        {lance ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={`Témoignage de ${prenom}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button onClick={() => setLance(true)} aria-label={`Lire le témoignage de ${prenom}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="v-play" aria-hidden>▶</span>
          </button>
        )}
      </div>
      <div className="v-video-cap">
        <strong>{prenom}</strong>
        <span>{resultat}</span>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [ouvert, setOuvert] = useState<number | null>(0);

  return (
    <div className="v-faq">
      {items.map((item, i) => (
        <div key={item.q} className={`v-faq-item${ouvert === i ? " is-open" : ""}`}>
          <button className="v-faq-q" onClick={() => setOuvert(ouvert === i ? null : i)} aria-expanded={ouvert === i}>
            {item.q}
            <span className="v-faq-sign" aria-hidden />
          </button>
          <div className="v-faq-a">
            <div><p>{item.a}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RevealOnScroll() {
  // Safari (surtout en PWA/ajout à l'écran d'accueil) rouvre parfois une page
  // là où on l'avait laissée au lieu de repartir du haut. La page de vente
  // doit toujours s'ouvrir sur le hero, jamais au milieu.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
