import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner, UpdateBanner } from "@/components/pwa/offline-banner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "G10 Flow - Gestión de Rutinas",
  description: "App de gestión de rutinas para gimnasios. Entrenadores y alumnos conectados.",
  keywords: ["gimnasio", "entrenamiento", "rutinas", "fitness", "workout"],
  authors: [{ name: "G10 Flow" }],
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "G10 Flow",
  },
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72" },
      { url: "/icons/icon-96x96.png", sizes: "96x96" },
      { url: "/icons/icon-128x128.png", sizes: "128x128" },
      { url: "/icons/icon-144x144.png", sizes: "144x144" },
      { url: "/icons/icon-152x152.png", sizes: "152x152" },
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
      { url: "/icons/icon-384x384.png", sizes: "384x384" },
      { url: "/icons/icon-512x512.png", sizes: "512x512" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1c1c1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="G10 Flow" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="G10 Flow" />
        <meta name="description" content="App de gestión de rutinas para gimnasios" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#f97316" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS Splash Screen Images */}
        <link rel="apple-touch-startup-image" href="/icons/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/icons/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1536x2048.png" media="(min-device-width: 768px) and (max-device-width: 1024px)" />
        <link rel="apple-touch-startup-image" href="/icons/splash-1668x2224.png" media="(min-device-width: 834px) and (max-device-width: 834px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/icons/splash-2048x2732.png" media="(min-device-width: 1024px) and (max-device-width: 1024px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <PWAProvider>
          <UpdateBanner />
          <OfflineBanner />
          {children}
          <InstallPrompt />
          <Toaster position="top-center" />
        </PWAProvider>
      </body>
    </html>
  );
}
