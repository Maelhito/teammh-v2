"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Screen {
  label: string;
  src: string;
}

const SCREENS: Screen[] = [
  { label: "Ton tableau de bord", src: "/time-to-start/screens/accueil.png" },
  { label: "Ton parcours", src: "/time-to-start/screens/parcours.png" },
  { label: "Ta bibliothèque de séances", src: "/time-to-start/screens/bibliotheque.png" },
  { label: "Ton profil", src: "/time-to-start/screens/profil.png" },
];

export default function PhoneShowcase() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function go(delta: number) {
    setIndex((i) => (i + delta + SCREENS.length) % SCREENS.length);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1);
    touchStartX.current = null;
  }

  const current = SCREENS[index];

  return (
    <div className="tts-showcase">
      <div
        className="tts-showcase-phone"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="tts-showcase-notch" />
        <div className="tts-showcase-screen">
          <Image
            key={current.src}
            src={current.src}
            alt={current.label}
            fill
            sizes="(max-width: 640px) 80vw, 300px"
            style={{ objectFit: "cover" }}
            priority={index === 0}
          />
        </div>
      </div>

      <div className="tts-showcase-controls">
        <button onClick={() => go(-1)} aria-label="Écran précédent" className="tts-showcase-arrow">‹</button>
        <div className="tts-showcase-label">{current.label}</div>
        <button onClick={() => go(1)} aria-label="Écran suivant" className="tts-showcase-arrow">›</button>
      </div>

      <div className="tts-showcase-dots">
        {SCREENS.map((s, i) => (
          <button
            key={s.label}
            className={"tts-showcase-dot" + (i === index ? " is-active" : "")}
            onClick={() => setIndex(i)}
            aria-label={"Voir : " + s.label}
          />
        ))}
      </div>
    </div>
  );
}
