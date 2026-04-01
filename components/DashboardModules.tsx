"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { UnlockStatus } from "@/lib/module-unlock";

interface ModuleItem {
  slug: string;
  title: string;
  category: string;
  duration?: string;
  completed: boolean;
  unlock: UnlockStatus;
  index: number;
}

function CountdownTimer({ unlocksAt }: { unlocksAt: string }) {
  const [diff, setDiff] = useState(() => new Date(unlocksAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(new Date(unlocksAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [unlocksAt]);

  if (diff <= 0) return <span style={{ color: "#4ADE80", fontSize: 11 }}>Disponible maintenant !</span>;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${String(minutes).padStart(2, "0")}m`);
  parts.push(`${String(seconds).padStart(2, "0")}s`);

  return (
    <span style={{ fontSize: 11, color: "#555", fontVariantNumeric: "tabular-nums" }}>
      Disponible dans {parts.join(" ")}
    </span>
  );
}

export default function DashboardModules({ items }: { items: ModuleItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
      {items.map((item) => {
        const { unlock, completed } = item;

        if (!unlock.unlocked) {
          return (
            <div
              key={item.slug}
              style={{
                backgroundColor: "#0D0D0D",
                borderRadius: 12,
                border: "1px solid #1a1a1a",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                opacity: 0.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span className="font-title" style={{ fontSize: "1.1rem", color: "#444", flexShrink: 0, lineHeight: 1 }}>
                  {String(item.index).padStart(2, "0")}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className="font-body" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#555", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title}
                  </p>
                  <div style={{ marginTop: 3 }}>
                    {unlock.unlocksAt ? (
                      <CountdownTimer unlocksAt={unlock.unlocksAt} />
                    ) : (
                      <span style={{ fontSize: 11, color: "#444" }}>Complète les modules précédents</span>
                    )}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>🔒</span>
            </div>
          );
        }

        return (
          <Link key={item.slug} href={`/modules/${item.slug}`} style={{ textDecoration: "none" }}>
            <div
              style={{
                backgroundColor: "#111111",
                borderRadius: 12,
                border: completed ? "1px solid rgba(74,222,128,0.2)" : "1px solid #1a1a1a",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span className="font-title" style={{ fontSize: "1.1rem", color: completed ? "#4ADE80" : "#B22222", flexShrink: 0, lineHeight: 1 }}>
                  {completed ? "✓" : String(item.index).padStart(2, "0")}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className="font-body" style={{ fontWeight: 700, fontSize: "0.85rem", color: completed ? "rgba(245,245,240,0.6)" : "#F5F5F0", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title}
                  </p>
                  <p className="font-body" style={{ fontSize: "0.72rem", color: "#555", marginTop: 2 }}>
                    {item.category}{item.duration ? ` · ${item.duration}` : ""}
                  </p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={completed ? "rgba(74,222,128,0.4)" : "#B22222"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
