import Link from "next/link";
import { ttsColors } from "@/lib/tts-theme";

const THUMB_GRADIENTS: Record<string, string> = {
  video: "linear-gradient(135deg,#B22222,#5a1010)",
  recipe: "linear-gradient(135deg,#3a3a1f,#1f1f12)",
  module: "linear-gradient(135deg,#1f2a3a,#101820)",
};

export function TtsProgressRing({ progress, size = 76, strokeWidth = 7, children }: { progress: number; size?: number; strokeWidth?: number; children: React.ReactNode }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1));
  const center = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={ttsColors.cardBorder} strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={radius} fill="none" stroke={ttsColors.redBright} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

export function TtsSectionTitle({ children, count }: { children: React.ReactNode; count?: string }) {
  return (
    <div
      className="font-body"
      style={{
        color: ttsColors.offWhite,
        fontSize: 15,
        letterSpacing: "1.5px",
        margin: "22px 0 12px",
        paddingLeft: 10,
        borderLeft: `3px solid ${ttsColors.redBright}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: 700,
      }}
    >
      {children}
      {count && <span style={{ color: ttsColors.muted, fontSize: 11, letterSpacing: 0, fontWeight: 400 }}>{count}</span>}
    </div>
  );
}

interface TtsRowCardProps {
  thumbEmoji: string;
  thumbVariant?: "video" | "recipe" | "module";
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
  locked?: boolean;
  badge?: React.ReactNode;
}

export function TtsRowCard({ thumbEmoji, thumbVariant = "module", title, subtitle, href, onClick, locked, badge }: TtsRowCardProps) {
  const content = (
    <div
      style={{
        background: ttsColors.card,
        border: `1px solid ${ttsColors.cardBorder}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: locked ? 0.55 : 1,
        textAlign: "left",
        width: "100%",
        cursor: href || onClick ? "pointer" : "default",
      }}
    >
      <div style={{ width: 54, height: 54, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: THUMB_GRADIENTS[thumbVariant] }}>
        {thumbEmoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-body" style={{ color: "#fff", fontSize: "14.5px", fontWeight: 600, margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        <p className="font-body" style={{ color: ttsColors.muted, fontSize: 12, margin: 0 }}>{subtitle}</p>
      </div>
      {badge ?? (locked ? (
        <span className="font-body" style={{ background: "#2A2020", color: ttsColors.muted, fontSize: 10, padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>Verrouillé</span>
      ) : (
        <span style={{ color: ttsColors.muted, fontSize: 18, flexShrink: 0 }}>›</span>
      ))}
    </div>
  );

  if (href && !locked) {
    return <Link href={href} style={{ textDecoration: "none", display: "block" }}>{content}</Link>;
  }
  if (onClick && !locked) {
    return <button onClick={onClick} style={{ background: "none", border: "none", padding: 0, display: "block", width: "100%" }}>{content}</button>;
  }
  return content;
}

export function TtsNewBadge() {
  return (
    <span className="font-body" style={{ background: ttsColors.redBright, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>
      NEW
    </span>
  );
}

export function TtsFilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-body"
      style={{
        background: active ? ttsColors.red : ttsColors.card,
        border: `1px solid ${active ? ttsColors.red : ttsColors.cardBorder}`,
        color: active ? "#fff" : ttsColors.muted,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        padding: "7px 14px",
        borderRadius: 20,
        whiteSpace: "nowrap",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
