import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-tts.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Time To Start",
  },
};

export default function TtsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
