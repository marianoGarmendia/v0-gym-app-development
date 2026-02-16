/**
 * API Route para generar manifest.json dinámico por tenant
 * 
 * Cada tenant tiene su propio manifest con:
 * - Nombre del gimnasio
 * - Colores personalizados
 * - Iconos del tenant
 * 
 * Esto permite que cada gimnasio tenga su propia PWA instalable.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTenantSlug, getTenantBySlug } from "@/lib/tenant";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = url.host;
  
  // Extraer slug del tenant
  const slug = extractTenantSlug(host);
  
  // Configuración por defecto (si no hay tenant)
  let manifest = generateDefaultManifest();
  
  // Si hay tenant, personalizar el manifest
  if (slug) {
    const tenant = await getTenantBySlug(slug);
    
    if (tenant) {
      manifest = generateTenantManifest(tenant);
    }
  }
  
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600", // Cachear por 1 hora
    },
  });
}

/**
 * Genera el manifest por defecto (sin tenant)
 */
function generateDefaultManifest() {
  return {
    name: "G10 Flow - Gestión de Entrenamientos",
    short_name: "G10 Flow",
    description: "Plataforma de gestión de rutinas de entrenamiento para gimnasios",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1c1c",
    theme_color: "#f97316",
    orientation: "portrait",
    scope: "/",
    lang: "es",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "maskable any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Dashboard de entrenamiento",
      },
      {
        src: "/screenshots/routine-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Vista de rutina",
      },
      {
        src: "/screenshots/dashboard-desktop.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Dashboard en escritorio",
      },
    ],
    categories: ["health", "fitness", "sports"],
    shortcuts: [
      {
        name: "Mi Rutina",
        short_name: "Rutina",
        description: "Ver mi rutina de hoy",
        url: "/dashboard/routines",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "Mis Entrenadores",
        short_name: "Entrenadores",
        description: "Ver mis entrenadores",
        url: "/dashboard/trainers",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}

/**
 * Genera el manifest personalizado para un tenant
 */
function generateTenantManifest(tenant: {
  id: string;
  slug: string;
  name: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
}) {
  const baseManifest = generateDefaultManifest();
  
  return {
    ...baseManifest,
    name: `${tenant.name} - G10 Flow`,
    short_name: tenant.name,
    description: `App de entrenamiento de ${tenant.name}`,
    theme_color: tenant.theme.primaryColor,
    background_color: tenant.theme.secondaryColor,
    // Si el tenant tiene logo personalizado, usarlo
    icons: tenant.theme.logoUrl
      ? [
          ...baseManifest.icons.slice(0, -1),
          {
            src: tenant.theme.logoUrl,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ]
      : baseManifest.icons,
  };
}
