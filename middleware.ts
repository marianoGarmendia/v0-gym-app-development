import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

/*
Esto es una convención de Next.js: si existe un archivo llamado middleware.ts
  en la raíz del proyecto, Next.js automáticamente ejecuta la función
  middleware() exportada antes de cada request que matchee el patrón del matcher.

  El matcher es un regex que dice "ejecutate en todas las rutas excepto archivos
  estáticos (imágenes, CSS, JS del build)". Así que aplica a /dashboard,
  /auth/admin, /api/admin/create-user, etc.

  No necesitás registrarlo en ningún lado. Next.js lo detecta solo por el nombre
  y ubicación del archivo.

  Sin middleware, eso sigue funcionando. La diferencia es:
  Con middleware: El request se frena antes de llegar al Server Component
  Sin middleware: El Server Component se ejecuta, verifica, y después redirige
  ────────────────────────────────────────
  Con middleware: Los tokens se refrescan automáticamente en cada request
  Sin middleware: Los tokens no se refrescan server-side → después de ~1 hora la
    sesión muere
  El middleware agrega dos cosas: protección más temprana y refresh de tokens.
  Sin él, la app funciona pero la sesión no se renueva silenciosamente.

  NextResponse.next()

  Sí, exactamente. Es "dejá pasar este request al siguiente paso". Es como un
  guardia que dice "todo bien, seguí adelante".

  - NextResponse.next() → dejá pasar
  - NextResponse.redirect(url) → mandalo a otra URL
  - NextResponse.json(...) → respondé directamente sin llegar al page

  Cualquier request HTTP que llegue a tu servidor Next.js pasa por el middleware:    
                                                                                                
  - Navegar a una página: /dashboard, /auth/sign-up, etc.                                       
  - Fetch a una API: fetch("/api/auth/sign-up"), fetch("/api/admin/create-user"), etc.        
  - Links: hacer click en un <Link href="/dashboard/routines">                                  
  - Redirects: router.push("/dashboard")                                                        

  Todo pasa por el middleware primero. Por eso el fetch("/api/auth/sign-up") te daba 307: el
  middleware lo interceptaba, veía que no había sesión, y lo redirigía a /auth/login antes de
  que llegue a tu endpoint.

  objetivo + plazo

nivel + frecuencia + tiempo por sesión

lesiones/limitaciones

- si combina con clases como crossfit, high, intense?

peso/altura/edad



*/
