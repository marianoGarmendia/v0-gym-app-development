# Fixes de la sesión - Multi-tenant

## 1. Service Worker bloqueado por redirect (`sw.js`)

**Síntoma:**
```
Failed to register a ServiceWorker for scope ('http://gimnasio-default.localhost:3000/')
with script ('http://gimnasio-default.localhost:3000/sw.js'):
The script resource is behind a redirect, which is disallowed.
```

**Causa:**
El `matcher` del middleware de Next.js interceptaba todas las rutas, incluyendo `/sw.js`.
Cuando el usuario no estaba autenticado, el middleware redirigía `/sw.js` al login.
Los Service Workers no permiten que su script sea una redirección, necesitan el archivo directamente.

**Fix en `middleware.ts`:**
```ts
// Antes:
"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"

// Después: se agrega sw\.js a las exclusiones
"/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
```

---

## 2. "No tienes acceso a este gimnasio" al cambiar de tenant con sesión activa

**Síntoma:**
Teniendo sesión activa en `gimnasio-test`, al intentar acceder a `gimnasio-default` el middleware
devolvía 403 incluso en la página de login.

**Causa:**
El middleware verifica que `user.app_metadata.active_tenant_id` coincida con el tenant del subdominio.
Esta verificación ocurría ANTES de chequear si la ruta era pública, bloqueando incluso `/auth/login`.

**Flujo problemático:**
```
1. Usuario tiene sesión de gimnasio-test
2. Accede a gimnasio-default.localhost:3000/auth/login
3. Middleware: tenantSlug = "gimnasio-default" → tenant encontrado ✓
4. Middleware: user existe → verifica active_tenant_id
5. active_tenant_id = gimnasio-test ≠ gimnasio-default → 403 ✗
6. Nunca llega a chequear que /auth/login es ruta pública
```

**Solución temporal del usuario:** borrar cookies manualmente para eliminar la sesión anterior.

**Fix pendiente en `middleware.ts`:** saltear el chequeo de membresía para rutas públicas:
```ts
const isPublicRouteForTenantCheck = publicRoutes.some(
  (route) => pathname === route
);
if (user && !isPublicRouteForTenantCheck) {
  // verificar active_tenant_id...
}
```
> Este fix fue propuesto pero el usuario no lo aplicó todavía.

---

## 3. 500 en `/api/auth/sign-up` al registrar un email existente

**Síntoma:**
```
Error creating membership: {
  code: '42501',
  message: 'new row violates row-level security policy for table "tenant_memberships"'
}
POST /api/auth/sign-up 500
```

**Causa: contaminación del cliente admin con sesión de usuario**

La ruta `/api/auth/sign-up` tiene un flujo para manejar emails ya existentes (`handleExistingUser`):
1. Se verifica la contraseña llamando `supabaseAdmin.auth.signInWithPassword()`
2. Se inserta en `tenant_memberships` con el mismo `supabaseAdmin`

El problema: al llamar `signInWithPassword()` en el cliente admin, **el cliente cambia su estado de auth** al usuario que acaba de loguear. Ya no usa la service role key → pasa a usar el JWT del usuario. Las siguientes operaciones de ese cliente corren como usuario autenticado, no como service role.

La tabla `tenant_memberships` no tiene políticas RLS de INSERT para usuarios autenticados (solo service_role puede insertar, para evitar que usuarios se agreguen a sí mismos a tenants arbitrarios). Entonces el INSERT falla con 42501.

```
supabaseAdmin (service_role)
  │
  ├── signInWithPassword() → ⚠️ el cliente ahora tiene JWT del usuario
  │
  └── .from("tenant_memberships").insert() → corre como usuario autenticado → RLS bloquea ✗
```

**Fix en `app/api/auth/sign-up/route.ts`:**
Usar un cliente anon separado solo para verificar la contraseña, sin tocar el cliente admin:

```ts
// Antes: usaba supabaseAdmin para el sign-in (contaminaba su auth state)
const { data: signInData, error: signInError } =
  await supabaseAdmin.auth.signInWithPassword({ email, password });

// Después: cliente anon separado solo para verificación
const { createClient: createAnonClient } = await import("@supabase/supabase-js");
const anonClient = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const { data: signInData, error: signInError } =
  await anonClient.auth.signInWithPassword({ email, password });
// supabaseAdmin sigue siendo service_role → INSERT en tenant_memberships funciona ✓
```

---

## Conceptos clave aprendidos

### RLS y roles en Supabase
- **anon**: usuario no autenticado. Solo puede hacer lo que las políticas de `anon` permiten.
- **authenticated**: usuario con JWT válido. Las políticas RLS filtran por su `uid()` / `tenant_id`.
- **service_role**: bypasea RLS completamente. Úsalo solo server-side con la service role key.

### Por qué `current_user_tenant_id()` funciona
La función lee el `active_tenant_id` del JWT (`app_metadata`) para aislar datos por tenant.
Esto permite que RLS filtre automáticamente sin necesitar `WHERE tenant_id = ...` en cada query.

### El problema del cliente "contaminado"
Un cliente de Supabase es stateful respecto a la sesión de auth.
Si llamás `signInWithPassword()` en un cliente que usás para operaciones admin,
ese cliente deja de comportarse como service_role para las operaciones siguientes.
**Regla:** un cliente por propósito — admin para writes privilegiados, anon/user para auth.
