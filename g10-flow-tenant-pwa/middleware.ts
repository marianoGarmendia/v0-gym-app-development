import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { resolveTenant, validateTenantMatch } from "@/lib/middleware/tenant";
import { TENANT_COOKIE_NAME } from "@/lib/tenant";

/**
 * Middleware principal de G10 Flow
 * 
 * Este middleware maneja:
 * 1. Actualización de sesión de Supabase (auth)
 * 2. Resolución de tenant por subdominio
 * 3. Validación de coincidencia tenant-token
 * 4. Redirecciones y protección de rutas
 */

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // ============================================
  // PASO 1: Actualizar sesión de Supabase
  // ============================================
  let response = await updateSession(request);
  
  // ============================================
  // PASO 2: Resolver tenant por subdominio
  // ============================================
  const { tenant, response: tenantResponse } = await resolveTenant(request);
  
  // Si hay respuesta de error del tenant, retornarla
  if (tenantResponse) {
    return tenantResponse;
  }
  
  // ============================================
  // PASO 3: Si hay tenant, validar y adjuntar
  // ============================================
  if (tenant) {
    // Verificar coincidencia de tenant (token vs request)
    const isValidTenant = validateTenantMatch(request, tenant.id);
    
    if (!isValidTenant) {
      // Tenant del token no coincide con el del subdominio
      return NextResponse.json(
        { error: "Acceso denegado. El tenant no coincide con tu sesión." },
        { status: 403 }
      );
    }
    
    // Adjunta el tenantId a los headers para uso en Server Components
    response.headers.set("x-tenant-id", tenant.id);
    response.headers.set("x-tenant-slug", tenant.slug);
    response.headers.set("x-tenant-name", tenant.name);
    
    // Setear cookie de tenant para el cliente
    response.cookies.set(TENANT_COOKIE_NAME, tenant.id, {
      path: "/",
      httpOnly: false, // Necesario para que el cliente pueda leerlo
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 año
    });
  }
  
  return response;
}

/**
 * Configuración del matcher del middleware
 * 
 * El middleware se ejecuta en todas las rutas excepto:
 * - Archivos estáticos (_next/static, _next/image)
 * - Favicon
 * - Archivos de imagen (svg, png, jpg, etc.)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
