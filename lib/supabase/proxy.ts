import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
Cuando hacés login en /auth/admin:                                             
                                                                                 
  await supabase.auth.signInWithPassword({ email, password });

  Supabase Auth responde con dos tokens:
  - access_token (JWT, dura ~1 hora)
  - refresh_token (dura días/semanas)

  El paquete @supabase/ssr automáticamente los guarda en cookies del browser. A
  partir de ahí, cada request HTTP que el browser hace a tu servidor incluye esas
   cookies automáticamente (así funcionan las cookies, el browser las adjunta
  solo).

  Qué pasa en cada request a /dashboard

  Browser hace request a /dashboard
    │
    │  ← Las cookies (con los tokens) van adjuntas automáticamente
    │
    ▼
  MIDDLEWARE (proxy.ts) - updateSession()
    │
    │  Paso 1: Lee las cookies del request (línea 15)
    │           request.cookies.getAll() → access_token, refresh_token
    │
    │  Paso 2: Crea un cliente Supabase con esas cookies (línea 9)
    │
    │  Paso 3: getUser() (línea 34)
    │           → Envía el access_token a Supabase
    │           → Supabase dice "sí, es válido, es este usuario"
    │
    │  Paso 4 (importante): Si el access_token expiró,
    │           @supabase/ssr usa el refresh_token para pedir uno nuevo.
    │           Los nuevos tokens se guardan en las cookies de la RESPUESTA
    │           (líneas 18-27, el setAll).
    │           ↑ ESTO es lo que hace "updateSession": refrescar los tokens
    │
    │  Paso 5: user existe → deja pasar
    │
    ▼
  LAYOUT (dashboard/layout.tsx)
    │
    │  Paso 1: Lee las cookies con cookies() de Next.js (server.ts:5)
    │           Son las MISMAS cookies del request
    │
    │  Paso 2: getUser() → misma validación, obtiene el user
    │
    │  Paso 3: .from("profiles").select("*") → trae datos de TU tabla
    │
    ▼
  PAGE (dashboard/page.tsx)
    │
    │  Lo mismo: getUser() + query a profiles
    │
    ▼
  RESPUESTA al browser
    │  ← Si el middleware refrescó tokens, las nuevas cookies
    │     van en la respuesta y el browser las guarda

  La parte clave: updateSession

  El nombre "updateSession" es un poco confuso. Lo que realmente hace es:

  1. Leer los tokens de las cookies del request
  2. Validar el access_token con Supabase
  3. Refrescar los tokens si expiraron (usando el refresh_token)
  4. Escribir los nuevos tokens en las cookies de la respuesta

  Sin esto, después de ~1 hora el access_token expiraría y el usuario quedaría
  deslogueado. El middleware mantiene la sesión viva silenciosamente en cada
  request.

  Resumen
  Momento: Login (signInWithPassword)
  Dónde están los tokens: Supabase los genera → @supabase/ssr los guarda en
    cookies del browser
  ────────────────────────────────────────
  Momento: Cada request del browser
  Dónde están los tokens: Las cookies viajan automáticamente en el HTTP request
  ────────────────────────────────────────
  Momento: Middleware (updateSession)
  Dónde están los tokens: Lee las cookies, valida, refresca si hace falta
  ────────────────────────────────────────
  Momento: Layout / Page (getUser)
  Dónde están los tokens: Lee las mismas cookies, valida el token
  ────────────────────────────────────────
  Momento: Respuesta al browser
  Dónde están los tokens: Si se refrescaron, las nuevas cookies se guardan en el
    browser
*/

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except for public routes)
  const publicRoutes = ["/", "/auth/login", "/auth/sign-up", "/auth/error", "/auth/sign-up-success", "/auth/admin", "/auth/callback", "/auth/reset-password", "/api/admin/create-user", "/api/auth/sign-up"];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
