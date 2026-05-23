import type { ReactNode } from "react";
import CoachSidebar from "./CoachSidebar";

export const metadata = { title: "Coach — Time to Move" };

export default function CoachLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f5f7" }}>
      <CoachSidebar />
      <main className="coach-layout-main" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
