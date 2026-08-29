"use client";

export default function TtlStreakFlame({ days }: { days: number }) {
  const size = Math.min(16 + days * 1.4, 40);
  const speed = days >= 14 ? 0.85 : days >= 7 ? 1.1 : 1.5;

  return (
    <>
      <style>{`
        @keyframes ttl-flame-outer {
          0%, 100% { transform: scaleY(1) scaleX(1) skewX(0deg); }
          20% { transform: scaleY(1.06) scaleX(0.96) skewX(-2deg); }
          45% { transform: scaleY(0.95) scaleX(1.04) skewX(2deg); }
          70% { transform: scaleY(1.04) scaleX(0.97) skewX(-1deg); }
        }
        @keyframes ttl-flame-inner {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          30% { transform: scaleY(0.9) scaleX(1.06); }
          60% { transform: scaleY(1.07) scaleX(0.94); }
        }
      `}</style>
      <svg width={size} height={size * 1.3} viewBox="0 0 24 32" style={{ flexShrink: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="ttl-flame-outer-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#8B0000" />
            <stop offset="55%" stopColor="#E63946" />
            <stop offset="100%" stopColor="#FFA733" />
          </linearGradient>
          <linearGradient id="ttl-flame-inner-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFE08A" />
          </linearGradient>
        </defs>
        <path
          d="M12 1 C 9 6 5 10 5 16 C 5 21.5 8 26 12 30 C 16 26 19 21.5 19 16 C 19 10 15 6 12 1 Z"
          fill="url(#ttl-flame-outer-grad)"
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: `ttl-flame-outer ${speed * 1.4}s ease-in-out infinite`,
          }}
        />
        <path
          d="M12 11 C 10 14 8 17 8 20.5 C 8 24 10 27 12 29 C 14 27 16 24 16 20.5 C 16 17 14 14 12 11 Z"
          fill="url(#ttl-flame-inner-grad)"
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animation: `ttl-flame-inner ${speed}s ease-in-out infinite`,
          }}
        />
      </svg>
    </>
  );
}
