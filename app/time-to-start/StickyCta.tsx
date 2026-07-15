"use client";

import { useEffect, useState } from "react";

export default function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("tts-hero");
    if (!hero || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <div className={"tts-sticky-cta" + (show ? " is-visible" : "")}>
      <a href="#offre" id="cta-sticky-mobile" data-event="tts_cta_sticky_click" className="tts-btn tts-btn-primary">
        Je démarre pour 4 900F/mois
      </a>
    </div>
  );
}
