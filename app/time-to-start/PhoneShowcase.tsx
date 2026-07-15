"use client";

import { useRef, useState } from "react";

interface Screen {
  label: string;
  rows: string[];
}

const SCREENS: Screen[] = [
  { label: "Ton tableau de bord", rows: ["accent", "", "", ""] },
  { label: "Une séance du jour", rows: ["", "tall accent", "", ""] },
  { label: "Une recette", rows: ["tall", "accent", ""] },
  { label: "Ton calendrier de la semaine", rows: ["", "", "tall accent", ""] },
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
          <span className="tts-showcase-tag">Capture à venir</span>
          <div className="tts-showcase-rows">
            {current.rows.map((r, i) => (
              <div key={i} className={"tts-showcase-row " + r} />
            ))}
          </div>
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
