# G10 Flow - Sistema Multi-Tenant + PWA

Este documento describe la implementación del sistema multi-tenant marca blanca y la funcionalidad PWA para G10 Flow.

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura Multi-Tenant](#arquitectura-multi-tenant)
3. [Configuración PWA](#configuración-pwa)
4. [Instalación](#instalación)
5. [Uso](#uso)
6. [API Reference](#api-reference)

---

## 🎯 Visión General

G10 Flow ahora soporta múltiples gimnasios (tenants) con:

- **Subdominios personalizados**: `gimnasio-uno.tuapp.com`
- **Branding por tenant**: Colores, logo, nombre personalizado
- **Aislamiento de datos**: Cada tenant solo ve sus propios datos
- **PWA instalable**: Funciona offline en Android e iOS
- **Nueva funcionalidad**: Students pueden ver entrenadores disponibles

---

## 🏗️ Arquitectura Multi-Tenant

### Resolución de Tenant

```
Request: gimnasio-uno.g10flow.app/dashboard
    │
    ▼
Middleware: extractTenantSlug()
    │
    ▼
Buscar tenant en DB: slug = 'gimnasio-uno'
    │
    ▼
Validar: tenant existe y está activo
    │
    ▼
Adjuntar a request: req.tenant = { id, slug, name, theme }
```

### Aislamiento de Datos

Todas las queries deben incluir `tenant_id`:

```typescript
// ✅ Correcto
const { data } = await supabase
  .from("profiles")
  .select("*")
  .eq("tenant_id", tenantId)  // SIEMPRE filtrar por tenant
  .eq("role", "trainer");

// ❌ Incorrecto - No filtra por tenant
const { data } = await supabase
  .from("profiles")
  .select("*")
  .eq("role", "trainer");
```

### Estructura de Tablas

```
tenants/
├── id (UUID)
├── slug (unique) - "gimnasio-uno"
├── name - "Gimnasio Uno"
├── theme - { primaryColor, secondaryColor, logoUrl }
├── settings - { allowPublicSignup, requireInviteCode }
└── is_active

profiles/
├── id (UUID)
├── tenant_id (FK) ← CLAVE para aislamiento
├── email
├── role - admin/trainer/student
└── ...

trainer_profiles/
├── id
├── tenant_id (FK)
├── user_id (FK → profiles)
├── bio
├── specialties[]
├── experience_years
├── certifications[]
├── rating
└── total_students

invites/
├── id
├── tenant_id (FK)
├── code (unique)
├── role - student/trainer
├── max_uses
├── used_count
└── expires_at
```

---

## 📱 Configuración PWA

### Características

- ✅ **Instalable**: Botón "Agregar a pantalla de inicio"
- ✅ **Offline**: Cache de rutinas y datos esenciales
- ✅ **Service Worker**: Actualizaciones en background
- ✅ **Manifest dinámico**: Por tenant (colores, nombre)
- ✅ **Push notifications**: Preparado para implementar
- ✅ **Splash screens**: Para iOS

### Archivos del PWA

```
public/
├── sw.js                    # Service Worker
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── screenshots/
    ├── dashboard-mobile.png
    └── dashboard-desktop.png
```

### Manifest Dinámico

Cada tenant tiene su propio manifest:

```json
// gimnasio-uno.g10flow.app/api/manifest
{
  "name": "Gimnasio Uno - G10 Flow",
  "short_name": "Gimnasio Uno",
  "theme_color": "#f97316",
  "background_color": "#1c1c1c",
  "icons": [...]
}
```

---

## 🚀 Instalación

### 1. Configurar Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
ADMIN_SECRET_KEY=tu-clave-secreta
APP_ROOT_DOMAIN=g10flow.app  # Dominio principal
```

### 2. Ejecutar Migraciones SQL

```bash
# En el SQL Editor de Supabase, ejecutar:
# sql/tenant-migration.sql
```

### 3. Crear Primer Tenant

```sql
INSERT INTO tenants (slug, name, description, email)
VALUES (
  'mi-gimnasio',
  'Mi Gimnasio',
  'Descripción del gimnasio',
  'contacto@migimnasio.com'
);
```

### 4. Configurar DNS (Producción)

Para cada tenant, agregar un registro CNAME:

```
Type: CNAME
Name: mi-gimnasio
Value: cname.vercel-dns.com
TTL: 3600
```

En Vercel, agregar el dominio personalizado.

### 5. Instalar Dependencias

```bash
pnpm install
```

### 6. Desarrollo Local

Para probar con subdominios locales:

```bash
# Opción 1: Usar lvh.me (resuelve a 127.0.0.1)
# Visitar: http://mi-gimnasio.lvh.me:3000

# Opción 2: Editar /etc/hosts
127.0.0.1 mi-gimnasio.localhost
# Visitar: http://mi-gimnasio.localhost:3000
```

---

## 📖 Uso

### Crear un Tenant (Admin)

```typescript
// POST /api/admin/tenants
const { data, error } = await supabase
  .from("tenants")
  .insert({
    slug: "nuevo-gimnasio",
    name: "Nuevo Gimnasio",
    theme: {
      primaryColor: "#3b82f6",
      secondaryColor: "#1e293b",
    },
  });
```

### Crear Invite Code

```typescript
// POST /api/admin/invites
const { data } = await supabase
  .from("invites")
  .insert({
    tenant_id: tenantId,
    code: "BIENVENIDO2024",
    role: "student",
    max_uses: 100,
    expires_at: "2024-12-31",
  });
```

### Signup con Invite

```
URL: https://mi-gimnasio.g10flow.app/auth/signup?invite=BIENVENIDO2024
```

### Ver Entrenadores (Student)

1. Navegar a `/dashboard/trainers`
2. Ver listado de entrenadores del gimnasio
3. Click en un entrenador para ver perfil detallado

---

## 🔌 API Reference

### Middleware

#### `resolveTenant(request)`

Extrae y valida el tenant del subdominio.

```typescript
import { resolveTenant } from "@/lib/middleware/tenant";

const { tenant, response } = await resolveTenant(request);

if (response) {
  // Error: tenant no encontrado
  return response;
}

// tenant = { id, slug, name }
```

#### `extractTenantSlug(host)`

```typescript
import { extractTenantSlug } from "@/lib/tenant";

extractTenantSlug("gimnasio-uno.g10flow.app"); // "gimnasio-uno"
extractTenantSlug("localhost:3000"); // null
extractTenantSlug("gimnasio.lvh.me"); // "gimnasio"
```

### Hooks

#### `usePWA()`

```typescript
import { usePWA } from "@/components/pwa/pwa-provider";

function MyComponent() {
  const { 
    isInstalled,      // boolean - ¿Está instalada la PWA?
    isInstallable,    // boolean - ¿Se puede instalar?
    isOffline,        // boolean - ¿Está offline?
    installPrompt,    // () => Promise<void> - Mostrar prompt de instalación
    updateAvailable,  // boolean - ¿Hay actualización disponible?
    updateApp,        // () => void - Actualizar la app
  } = usePWA();
  
  // ...
}
```

---

## 🧪 Testing

### Test Multi-Tenant

```bash
# 1. Crear dos tenants
curl -X POST http://localhost:3000/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"gym-a","name":"Gym A"}'

curl -X POST http://localhost:3000/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"gym-b","name":"Gym B"}'

# 2. Verificar aislamiento
# gym-a.lvh.me:3000 - Solo debe ver datos de Gym A
# gym-b.lvh.me:3000 - Solo debe ver datos de Gym B
```

### Test PWA

1. Abrir Chrome DevTools → Lighthouse
2. Run "PWA" audit
3. Verificar que pasa todas las verificaciones

### Test Offline

1. Instalar la PWA
2. Ir a DevTools → Network → Offline
3. Verificar que la app sigue funcionando

---

## 🐛 Troubleshooting

### "Tenant no encontrado"

- Verificar que el slug existe en la tabla `tenants`
- Verificar que `is_active = true`
- Verificar el DNS/CNAME

### "403 Forbidden - Tenant mismatch"

- El usuario tiene sesión de otro tenant
- Cerrar sesión y volver a iniciar

### PWA no se instala

- Verificar que `/api/manifest` devuelve JSON válido
- Verificar que los iconos existen
- Verificar HTTPS (requerido para PWA)

### Service Worker no se registra

- Verificar que `sw.js` está en `/public`
- Verificar HTTPS
- Revisar consola por errores

---

## 📚 Recursos

- [Next.js PWA](https://nextjs.org/docs/app/building-your-progressive-web-app)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Multi-tenant Architecture](https://supabase.com/docs/guides/platform/multi-tenancy)

---

**¿Preguntas?** Crea un issue en GitHub o contacta al equipo de soporte.
