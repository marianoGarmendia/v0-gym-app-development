/**
 * Middleware de resolución de Tenant
 * 
 * Este middleware:
 * 1. Extrae el subdominio del request
 * 2. Busca el tenant en la base de datos
 * 3. Valida que el tenant exista
 * 4. Adjunta el tenant al contexto del request
 */

import { NextResponse, type NextRequest } from "next/server";
import { extractTenantSlug, getTenantBySlug, TENANT_COOKIE_NAME } from "@/lib/tenant";

// Rutas públicas que no requieren tenant
const PUBLIC_ROUTES = [
  "/",
  "/api/health",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/icons",
  "/screenshots",
];

// Rutas que pueden estar en el dominio raíz (sin tenant)
const ROOT_DOMAIN_ROUTES = [
  "/",
  "/landing",
  "/pricing",
  "/contact",
  "/api/tenants",
];

/**
 * Verifica si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );
}

/**
 * Verifica si una ruta puede estar en el dominio raíz
 */
function isRootDomainRoute(pathname: string): boolean {
  return ROOT_DOMAIN_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );
}

/**
 * Middleware de resolución de tenant
 * 
 * @param request - NextRequest
 * @returns NextResponse con tenant adjunto o redirección/error
 */
export async function resolveTenant(request: NextRequest): Promise<{
  tenant: { id: string; slug: string; name: string } | null;
  response: NextResponse | null;
}> {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  
  // Ignorar rutas públicas (assets, etc.)
  if (isPublicRoute(pathname)) {
    return { tenant: null, response: null };
  }
  
  // Extraer slug del subdominio
  const slug = extractTenantSlug(host);
  
  // Si no hay slug y es una ruta del dominio raíz, permitir
  if (!slug && isRootDomainRoute(pathname)) {
    return { tenant: null, response: null };
  }
  
  // Si no hay slug y NO es ruta del dominio raíz, mostrar error
  if (!slug) {
    const response = NextResponse.rewrite(new URL("/tenant-not-found", request.url));
    return { tenant: null, response };
  }
  
  // Buscar tenant en la base de datos
  const tenant = await getTenantBySlug(slug);
  
  // Si el tenant no existe, mostrar página de error
  if (!tenant) {
    const response = NextResponse.rewrite(new URL("/tenant-not-found", request.url));
    return { tenant: null, response };
  }
  
  // Tenant encontrado, continuar
  return { 
    tenant: { 
      id: tenant.id, 
      slug: tenant.slug, 
      name: tenant.name 
    }, 
    response: null 
  };
}

/**
 * Verifica que el tenant del token coincida con el tenant del request
 * 
 * @param request - NextRequest
 * @param tenantId - ID del tenant del request
 * @returns true si coincide, false si no
 */
export function validateTenantMatch(
  request: NextRequest, 
  tenantId: string
): boolean {
  // Obtener tenantId de la cookie
  const cookieTenantId = request.cookies.get(TENANT_COOKIE_NAME)?.value;
  
  // Si hay cookie de tenant, validar que coincida
  if (cookieTenantId && cookieTenantId !== tenantId) {
    return false;
  }
  
  return true;
}
