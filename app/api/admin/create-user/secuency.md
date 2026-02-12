Secuencia completa del flujo de auth                                           
                                                                                 
  ---                                                                            
  FASE 1: Registro del Admin
                                                                                 
  Browser (/auth/admin)  →  POST /api/admin/create-user  →  Supabase             

  1. El usuario llena el formulario en /auth/admin (mode="create") con email,
  password y clave secreta.
  2. Validación local (page.tsx:69): verifica que secretKey === "G10ADMIN2024"
  antes de hacer cualquier request.
  3. Fetch a la API (page.tsx:77): envía un POST a /api/admin/create-user con {
  email, password, full_name, role: "admin", adminSecret }.
  4. El middleware deja pasar (proxy.ts:37): la ruta está en publicRoutes, así
  que no bloquea.
  5. La API route valida (route.ts:18): compara adminSecret con
  process.env.ADMIN_SECRET_KEY.
  6. Crea el usuario en Supabase Auth (route.ts:72): usa
  supabaseAdmin.auth.admin.createUser() con el service role key (clave con
  privilegios totales). Esto crea el usuario en la tabla interna auth.users con
  email_confirm: true (sin necesidad de verificar email).
  7. El trigger de PostgreSQL se dispara (001_create_schema.sql:152): el trigger
  on_auth_user_created detecta el INSERT en auth.users y automáticamente crea un
  registro en public.profiles leyendo full_name y role del raw_user_meta_data.
  8. La API devuelve éxito → el frontend muestra "Admin creado" y cambia a modo
  login.

  En este punto: el usuario existe en auth.users y en profiles, pero no hay
  sesión activa.

  ---
  FASE 2: Login del Admin

  Browser (/auth/admin)  →  Supabase Auth  →  Cookies  →  Redirect a /dashboard

  1. El usuario llena email y password (mode="login") y envía el formulario.
  2. signInWithPassword() (page.tsx:35): el cliente de Supabase del browser
  (lib/supabase/client.ts) hace un request directo a la API de Supabase Auth (no
  pasa por tu backend).
  3. Supabase responde con tokens: si las credenciales son correctas, devuelve un
   access token (JWT) y un refresh token.
  4. @supabase/ssr guarda los tokens en cookies: el paquete createBrowserClient
  automáticamente almacena los tokens en cookies del browser (no en
  localStorage). Las cookies se llaman algo como sb-<project>-auth-token. Esto es
   clave para que el server-side también pueda leerlas.
  5. Verificación de rol (page.tsx:47-51): el frontend consulta profiles para
  verificar que el role === "admin". Si no lo es, hace signOut().
  6. Redirect (page.tsx:60-61):
  router.push("/dashboard");
  router.refresh();
  6. router.refresh() fuerza a Next.js a re-ejecutar los Server Components, para
  que lean las cookies recién seteadas.

  ---
  FASE 3: Carga del Dashboard (y cada recarga)

  Browser → Middleware → Server Component → Supabase → Render

  Cada vez que el browser navega o recarga /dashboard, pasan 3 capas de
  verificación:

  Capa 1: Middleware (proxy.ts)

  Se ejecuta antes de que Next.js procese la página.

  1. Lee las cookies de auth del request (request.cookies.getAll()).
  2. Crea un cliente de Supabase server-side con esas cookies (proxy.ts:9).
  3. Llama a supabase.auth.getUser() (proxy.ts:34): esto envía el access token
  (de la cookie) a Supabase para validarlo. No confía en el JWT localmente, lo
  verifica contra el servidor de Supabase.
  4. Si el token está por expirar, Supabase devuelve nuevos tokens → setAll() los
   guarda en las cookies de la respuesta (proxy.ts:18-27). Así se refresca la
  sesión automáticamente.
  5. Si user = null y la ruta no es pública → redirect 307 a /auth/login.
  6. Si user existe → deja pasar.

  Capa 2: Layout (dashboard/layout.tsx)

  Es un Server Component que se ejecuta en el servidor.

  1. Crea un cliente Supabase server-side (lib/supabase/server.ts) que lee las
  cookies con cookies() de Next.js.
  2. Llama a getUser() de nuevo para obtener el usuario autenticado.
  3. Consulta profiles para obtener el perfil completo (rol, nombre, etc).
  4. Si no hay user o no hay perfil → redirect a login.
  5. Pasa profile.role al BottomNav y profile al ChatButton.

  Capa 3: Page (dashboard/page.tsx)

  Otro Server Component.

  1. Repite getUser() + query a profiles.
  2. Según profile.role, renderiza el componente correspondiente:
    - "admin" → <AdminDashboard />
    - "trainer" → <TrainerDashboard />
    - "student" → <StudentDashboardWrapper />

  ---
  Persistencia de sesión (cómo sobrevive al recargar)

  Cookies (sb-xxx-auth-token)
    ├── access_token (JWT, ~1 hora de vida)
    └── refresh_token (larga duración)

  - Los tokens viven en cookies HttpOnly, no en localStorage. Por eso el servidor
   puede leerlos.
  - En cada request, el middleware verifica el access token con Supabase.
  - Si el access token expiró, @supabase/ssr usa el refresh token para obtener
  uno nuevo y actualiza las cookies automáticamente en la respuesta.
  - Mientras el refresh token sea válido, la sesión persiste aunque cierres y
  abras el browser.

  Diagrama resumen

  REGISTRO:
    Form → API Route → supabaseAdmin.createUser() → trigger → profiles ✓

  LOGIN:
    Form → supabase.signInWithPassword() → tokens en cookies ✓

  CADA REQUEST A /dashboard:
    Browser (cookies)
      → Middleware: valida token, refresca si expiró
        → Layout (Server): getUser() + profiles → UI base
          → Page (Server): getUser() + profiles → dashboard según rol