"use client";
import { useState } from "react";
import Link from "next/link";

type AppLink = { href: string; label: string; desc: string; color: string };

export default function AdminAppLinks({ links }: { links: AppLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 28 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
          cursor: "pointer", padding: "0 0 12px", width: "100%", textAlign: "left",
        }}
      >
        <p style={{ fontSize: 11, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, fontFamily: "system-ui" }}>
          Liens de l&apos;application
        </p>
        <span style={{ fontSize: 10, color: "#333", marginLeft: "auto" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {links.map(({ href, label, desc, color }) => (
            <Link key={href} href={href} style={{
              display: "block", padding: "14px 16px", borderRadius: 10, textDecoration: "none",
              backgroundColor: "var(--admin-card2)", border: `1px solid ${color}30`,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color, margin: "0 0 2px", fontFamily: "system-ui" }}>{label}</p>
              <p style={{ fontSize: 11, color: "#555", margin: "0 0 6px", fontFamily: "system-ui" }}>{desc}</p>
              <code style={{ fontSize: 10, color: "var(--admin-text-dim)", fontFamily: "monospace" }}>
                teammj-v2.vercel.app{href}
              </code>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
