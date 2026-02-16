import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TenantThemeProvider } from "@/components/providers/tenant-theme-provider";
import { getTenantContext } from "@/lib/tenant/server";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "G10 Flow - Gestion de Rutinas",
  description: "App de gestion de rutinas para gimnasios. Entrenadores y alumnos conectados.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1c1c1c",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { tenantId, tenantName } = await getTenantContext();

  // Fetch tenant theme if we have a tenant
  let tenantTheme: Record<string, string> | null = null;
  if (tenantId) {
    const supabase = await createClient();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("theme")
      .eq("id", tenantId)
      .single();
    tenantTheme = tenant?.theme || null;
  }

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {tenantName && <title>{tenantName}</title>}
        <link rel="manifest" href="/api/manifest" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <TenantThemeProvider theme={tenantTheme}>
          {children}
        </TenantThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
