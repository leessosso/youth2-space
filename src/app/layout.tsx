import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://youth2-space.vercel.app"),
  title: "2청년회",
  description: "2청년회 통합 플랫폼 — 리더·훈련 프로그램",
  applicationName: "2청년회",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "2청년회",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased font-sans">
      <body className="flex h-full min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
