Plan: Contexto

 La infraestructura multi-tenant está implementada (DB, middleware, RLS). Falta un panel para
 que vos como dueño de la plataforma puedas: crear gimnasios (tenants), crear el primer admin
 de cada gimnasio, ver todos los clientes, y configurar branding. Acceso vía
 lvh.me:3000/super-admin (root domain, sin subdominio).

 ---
 1. DB: Nuevo rol superadmin

 Migración SQL (ejecutar en Supabase SQL Editor):

 - Crear tenant especial platform (slug: platform, name: Plataforma) — el superadmin pertenece
 a este tenant
 - Actualizar el CHECK constraint en profiles.role para incluir 'superadmin'
 - Agregar campos a tenants: plan (text, default 'free'), payment_status (text, default
 'pending'), max_students (int, default 50)
 - Policy: superadmin (rol = 'superadmin') puede SELECT/INSERT/UPDATE/DELETE en tenants sin
 restricción de tenant_id
 - Policy: superadmin puede SELECT en profiles de cualquier tenant (para ver usuarios por
 gimnasio)
 - Las API routes del super-admin usan service_role_key para bypasear RLS en operaciones de
 escritura

 Archivos: lib/types.ts

 ---
 2. Middleware: Permitir rutas /super-admin sin tenant

 Archivo: middleware.ts

 - Agregar /super-admin y sus subrutas a la lista de rutas que NO requieren subdominio/tenant
 - Si tenantSlug === null y la ruta es /super-admin/*, continuar sin resolver tenant
 - Si el user está logueado y va a /super-admin/*, verificar que su role === 'superadmin' → si
 no, 403

 ---
 3. API Routes

 3.1 app/api/super-admin/tenants/route.ts

 - GET: Listar todos los tenants (con conteo de usuarios por tenant). Requiere rol superadmin.
 - POST: Crear tenant nuevo (name, slug, description, email, phone, logo_url, theme, plan). Usa
  service_role_key para bypasear RLS.

 3.2 app/api/super-admin/tenants/[id]/route.ts

 - PATCH: Actualizar tenant (branding, estado, plan, payment_status)
 - DELETE: Desactivar tenant (soft delete: is_active = false)

 3.3 app/api/super-admin/tenants/[id]/create-admin/route.ts

 - POST: Crear primer usuario admin del gimnasio. Recibe email, password, full_name. Usa
 supabaseAdmin.auth.admin.createUser() con tenant_id en user_metadata y role: 'admin'. Mismo
 patrón que app/api/admin/create-user/route.ts.

 3.4 app/api/super-admin/stats/route.ts

 - GET: Métricas globales: total tenants, total usuarios, tenants activos, etc.

 ---
 4. Páginas UI

 4.1 Layout: app/super-admin/layout.tsx

 - Server component que valida sesión + rol superadmin
 - Sidebar/nav con links: Dashboard, Gimnasios, (futuro: Facturación)
 - Sin BottomNav ni ChatButton (no es el dashboard de gym)

 4.2 Dashboard: app/super-admin/page.tsx

 - Cards con métricas: Total gimnasios, gimnasios activos, total usuarios, usuarios este mes
 - Lista de gimnasios recientes

 4.3 Lista de gimnasios: app/super-admin/gyms/page.tsx

 - Tabla/cards con todos los tenants: nombre, slug, estado (activo/inactivo), plan,
 payment_status, cantidad de usuarios, fecha creación
 - Buscador, filtros por estado
 - Botón "Nuevo Gimnasio"

 4.4 Crear gimnasio: app/super-admin/gyms/new/page.tsx

 - Formulario completo: nombre, slug (auto-generado desde nombre), descripción, email,
 teléfono, logo (upload a Supabase Storage), colores primario/secundario (color picker), plan
 - Al crear, opción de crear admin del gimnasio en el mismo flujo (email, password, nombre)

 4.5 Detalle/Editar gimnasio: app/super-admin/gyms/[id]/page.tsx

 - Ver/editar datos del tenant
 - Lista de usuarios del gimnasio (admins, trainers, students con conteo)
 - Botón crear admin/trainer
 - Toggle activo/inactivo
 - Preview del branding

 ---
 5. Componentes

 - components/super-admin/gym-form.tsx — Formulario reutilizable crear/editar gimnasio
 - components/super-admin/stats-cards.tsx — Cards de métricas del dashboard
 - components/super-admin/gyms-table.tsx — Tabla de gimnasios con búsqueda y filtros
 - components/super-admin/create-admin-form.tsx — Formulario para crear el primer admin

 Usar componentes existentes: Card, Button, Input, Dialog, Badge, Table, Skeleton, Select de
 shadcn/ui.

 ---
 6. Orden de implementación

 1. Migración SQL (rol superadmin, campos nuevos en tenants, policies)
 2. Actualizar lib/types.ts
 3. Middleware (permitir rutas /super-admin)
 4. API routes (tenants CRUD, create-admin, stats)
 5. Layout super-admin
 6. Dashboard con stats
 7. Lista de gimnasios
 8. Crear gimnasio (formulario completo con branding)
 9. Detalle/editar gimnasio + crear admin

 ---
 Verificación

 1. Cambiar tu usuario a rol superadmin en la DB
 2. Ir a lvh.me:3000/super-admin → debe cargar el panel
 3. Crear un gimnasio nuevo con branding → verificar en DB
 4. Crear admin del gimnasio → verificar que el admin puede loguearse en slug.lvh.me:3000
 5. Un usuario normal que intente acceder a /super-admin → debe recibir 403
 6. Verificar que el superadmin pertenece al tenant platform y puede ver todos los gimnasios

 ** Implementation **

 Files Created/Modified                                                                        
                                                                                                
  SQL Migration                                                                                 
                                                                                                
  - scripts/005_super_admin.sql — Adds plan, payment_status, max_students to tenants, creates
  platform tenant, updates role CHECK to include superadmin, adds RLS policies for superadmin   
  cross-tenant access                                                                           
                                                                                                
  Types

  - lib/types.ts — Added "superadmin" to UserRole, added plan, payment_status, max_students to
  Tenant

  Middleware

  - middleware.ts — /super-admin and /api/super-admin routes skip tenant resolution, require
  authenticated user with role === 'superadmin'

  Shared Utility

  - lib/supabase/admin.ts — Reusable createAdminClient() using service_role_key

  API Routes

  - /api/super-admin/tenants — GET (list all with user counts), POST (create)
  - /api/super-admin/tenants/[id] — PATCH (update), DELETE (soft delete)
  - /api/super-admin/tenants/[id]/create-admin — POST (create first admin user)
  - /api/super-admin/tenants/[id]/users — GET (list tenant users)
  - /api/super-admin/stats — GET (global metrics)

  UI Pages

  - /super-admin — Layout with nav + dashboard with stats cards
  - /super-admin/gyms — Searchable/filterable list of gyms
  - /super-admin/gyms/new — Create gym form with branding + optional admin creation
  - /super-admin/gyms/[id] — Detail view with edit, user list, toggle active, create admin
  dialog

  Components

  - components/super-admin/stats-cards.tsx
  - components/super-admin/gyms-table.tsx
  - components/super-admin/gym-form.tsx
  - components/super-admin/create-admin-form.tsx

  Next Steps

  1. Run scripts/005_super_admin.sql in your Supabase SQL Editor
  2. Update your user to superadmin role (see comment at bottom of the SQL file)
  3. Go to lvh.me:3000/super-admin to test the panel

  1. Home page tenant-aware (app/page.tsx)                                                      
                                                                                                
  - Con subdominio (slug.localhost:3000): muestra "Bienvenido a NombreDelGimnasio", botón solo  
  de "Ingresar", sin CTA de registro genérico                                                   
  - Sin subdominio (localhost:3000): muestra la landing genérica de G10 Flow como antes
                                                                                                
  2. Configuración de branding para admin                                                       

  - /api/tenant — GET y PATCH para que el admin lea/actualice los datos de su gimnasio
  - components/settings/gym-settings.tsx — Sección "Mi Gimnasio" con: nombre, descripción,
  email, teléfono, URL de logo (con preview), color picker primario/secundario
  - Solo visible para rol admin en la página de Ajustes

  Probá:
  1. Entrá como admin a slug.localhost:3000 → la home debería decir el nombre de tu gimnasio
  2. Andá a Ajustes → deberías ver las secciones "Mi Gimnasio" y "Colores" debajo del perfil