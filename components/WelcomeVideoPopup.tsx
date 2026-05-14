"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_URL = "/bienvenue.mp4";
const DURATION_S = 40; // 40 secondes

export default function WelcomeVideoPopup({ userId }: { userId: string }) {
  const storageKey = `ttm_welcome_v1_${userId}`;
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState(DURATION_S);
  const [canClose, setCanClose] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) setVisible(true);
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current!);
  }, [visible]);

  function handleClose() {
    if (!canClose) return;
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeLabel = `${mins}:${String(secs).padStart(2, "0")}`;
  const progress = ((DURATION_S - remaining) / DURATION_S) * 100;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#111",
          border: "1px solid #222",
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "system-ui" }}>
            Bienvenue sur
          </p>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#F5F5F0", letterSpacing: "0.08em", margin: 0, fontFamily: "system-ui" }}>
            TIME TO MOVE
          </h2>
        </div>

        {/* Vidéo */}
        <div style={{ position: "relative", backgroundColor: "#000" }}>
          <video
            src={VIDEO_URL}
            autoPlay
            muted
            playsInline
            controls
            preload="auto"
            style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "contain" }}
          />
        </div>

        {/* Barre de progression */}
        <div style={{ height: 3, backgroundColor: "#1a1a1a" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: "#B22222",
              transition: "width 1s linear",
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 13, color: canClose ? "#555" : "#888", margin: 0, fontFamily: "system-ui", lineHeight: 1.4 }}>
            {canClose
              ? "Tu peux fermer cette fenêtre."
              : <>Regarde la vidéo jusqu'au bout &nbsp;<span style={{ color: "#B22222", fontWeight: 700 }}>{timeLabel}</span></>
            }
          </p>

          <button
            onClick={handleClose}
            disabled={!canClose}
            style={{
              flexShrink: 0,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              backgroundColor: canClose ? "#B22222" : "#1a1a1a",
              color: canClose ? "#fff" : "#333",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: canClose ? "pointer" : "not-allowed",
              fontFamily: "system-ui",
              transition: "background 0.3s",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
