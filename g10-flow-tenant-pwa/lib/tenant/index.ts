/**
 * Sistema Multi-Tenant para G10 Flow
 * 
 * Resolución de tenant por subdominio con aislamiento de datos
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

// Dominio raíz de la aplicación (configurable por variable de entorno)
export const APP_ROOT_DOMAIN = process.env.APP_ROOT_DOMAIN || "g10flow.app";

// Dominios de desarrollo locales
const DEV_DOMAINS = ["localhost", "lvh.me", "127.0.0.1"];

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
  settings: {
    allowPublicSignup: boolean;
    requireInviteCode: boolean;
    defaultTrainerRole: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Extrae el slug del tenant desde el header Host
 * 
 * Ejemplos:
 * - gimnasio_uno.g10flow.app → "gimnasio_uno"
 * - www.gimnasio_uno.g10flow.app → "gimnasio_uno"
 * - gimnasio_uno.localhost → "gimnasio_uno"
 * - g10flow.app → null (dominio raíz, sin tenant)
 */
export function extractTenantSlug(host: string): string | null {
  // Remover puerto si existe
  const hostname = host.split(":")[0];
  
  // Remover www.
  const cleanHostname = hostname.replace(/^www\./, "");
  
  // En desarrollo local, permitir slugs en localhost
  if (DEV_DOMAINS.some(domain => cleanHostname.includes(domain))) {
    // Formato: tenant.localhost o tenant.lvh.me
    const parts = cleanHostname.split(".");
    if (parts.length >= 2 && parts[0] !== "localhost" && parts[0] !== "lvh" && parts[0] !== "127") {
      return parts[0];
    }
    return null;
  }
  
  // En producción
  const parts = cleanHostname.split(".");
  
  // Si solo tiene 2 partes (ej: g10flow.com), es el dominio raíz
  if (parts.length <= 2) {
    return null;
  }
  
  // El slug es el primer subdominio
  return parts[0];
}

/**
 * Verifica si el hostname es el dominio raíz (sin tenant)
 */
export function isRootDomain(host: string): boolean {
  return extractTenantSlug(host) === null;
}

/**
 * Busca un tenant por su slug en la base de datos
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    theme: data.theme || {
      primaryColor: "#f97316",
      secondaryColor: "#1c1c1c",
    },
    settings: data.settings || {
      allowPublicSignup: true,
      requireInviteCode: false,
      defaultTrainerRole: "trainer",
    },
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Obtiene el tenant desde el request
 * Usado en Server Components y API routes
 */
export async function getTenantFromRequest(request: NextRequest): Promise<Tenant | null> {
  const host = request.headers.get("host") || "";
  const slug = extractTenantSlug(host);
  
  if (!slug) {
    return null;
  }
  
  return getTenantBySlug(slug);
}

/**
 * Genera la URL del tenant
 */
export function getTenantUrl(slug: string, path: string = ""): string {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${slug}.${APP_ROOT_DOMAIN}${path}`;
}

/**
 * Cookie name para almacenar el tenantId
 */
export const TENANT_COOKIE_NAME = "g10flow_tenant_id";

/**
 * Setea el tenantId en una cookie
 */
export function setTenantCookie(tenantId: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `${TENANT_COOKIE_NAME}=${tenantId}; Path=/; HttpOnly; Secure=${isProduction}; SameSite=Lax; Max-Age=31536000`;
}
