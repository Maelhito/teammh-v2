import type { ReactNode } from "react";
import CoachSidebar from "./CoachSidebar";

export const metadata = { title: "Coach — Time to Move" };

export default function CoachLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#f4f5f7" }}>
      <CoachSidebar />
      <main className="coach-layout-main" style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}
