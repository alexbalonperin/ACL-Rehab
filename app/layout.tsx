import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/nav/BottomNav";
import { AppInit } from "@/components/AppInit";

export const metadata: Metadata = {
  title: "ACL Rehab",
  description: "Personal ACL reconstruction rehab tracker",
  applicationName: "ACL Rehab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ACL Rehab",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppInit />
        <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-[calc(1rem+var(--safe-top))]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
