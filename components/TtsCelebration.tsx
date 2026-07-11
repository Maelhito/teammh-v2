"use client";

import { useEffect } from "react";
import { ttsColors } from "@/lib/tts-theme";

interface Props {
  message: string;
  emoji?: string;
  onDone: () => void;
}

export default function TtsCelebration({ message, emoji = "🎉", onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, pointerEvents: "none" }}>
      <style>{`
        @keyframes tts-celebration-pop {
          0% { transform: scale(0.6); opacity: 0; }
          15% { transform: scale(1.08); opacity: 1; }
          25% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          background: ttsColors.card,
          border: `2px solid ${ttsColors.green}`,
          borderRadius: 20,
          padding: "24px 32px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          animation: "tts-celebration-pop 1.6s ease forwards",
        }}
      >
        <p style={{ fontSize: 40, margin: 0 }}>{emoji}</p>
        <p className="font-body" style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "8px 0 0" }}>{message}</p>
      </div>
    </div>
  );
}
