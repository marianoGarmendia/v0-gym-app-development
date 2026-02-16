Plan: Multi-Tenant con Subdominios                                                           

 Contexto

 Convertir la app single-tenant en multi-tenant marca blanca. Cada gimnasio tiene subdominio
 (gimnasio.tuapp.com), aislamiento de datos via RLS, y branding propio. No se incluyen invite
 codes ni PWA en esta iteracion.

 Decisiones clave

 - No duplicar tablas: student_profiles no se crea (profiles ya tiene esos campos). Solo se
 crea trainer_profiles para datos extra (bio, specialties, certifications, rating).
 - RLS para aislamiento: Policies filtran por tenant_id automaticamente → no hay que modificar
 las ~36 queries SELECT existentes.
 - Inserts si necesitan cambio: Toda operacion .insert() debe incluir tenant_id.

 ---
 Fase 1: Migracion de Base de Datos

 Archivo nuevo: scripts/004_multi_tenant_migration.sql

 1.1 Crear tabla tenants

 - Campos: id, slug (unique), name, description, theme (JSONB), email, phone, is_active,
 created_at, updated_at
 - Indices en slug e is_active
 - RLS: users ven su tenant, admins pueden editar

 1.2 Crear tabla trainer_profiles

 - Campos: id, tenant_id, user_id (FK profiles), bio, specialties (TEXT[]), experience_years,
 certifications (TEXT[]), rating, total_students, availability, social_links (JSONB)
 - UNIQUE(tenant_id, user_id)
 - RLS: users del tenant ven, admins/trainers editan

 1.3 Agregar tenant_id a todas las tablas existentes

 - profiles, routines, workout_days, exercises, exercise_completions, comments,
 routine_assignments, trainer_students, trainer_notes, body_metrics
 - Crear indice en cada una

 1.4 Migrar datos existentes

 - Crear tenant default (gimnasio-default)
 - Asignar todos los profiles existentes a ese tenant
 - Propagar tenant_id a las demas tablas via FKs (routines toma de trainer, workout_days de
 routine, etc.)
 - Hacer ALTER COLUMN tenant_id SET NOT NULL en todas las tablas

 1.5 Reemplazar RLS policies permisivas

 Borrar todas las policies *_all que usan authenticated using (true) y crear nuevas con filtro:
 tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
 Policies por tabla:
 - profiles: SELECT mismo tenant, UPDATE solo propio
 - routines: ALL para trainer/admin del tenant, SELECT para students asignados
 - workout_days, exercises: ALL en mismo tenant
 - exercise_completions, comments, body_metrics: ALL para student propio, SELECT para
 trainer/admin del tenant
 - routine_assignments: ALL para trainer/admin, SELECT para student propio
 - trainer_students: ALL en mismo tenant
 - trainer_notes: ALL para trainer/admin del tenant
 - trainer_profiles: SELECT en mismo tenant, ALL para admin

 1.6 Actualizar trigger handle_new_user()

 Leer tenant_id de raw_user_meta_data e incluirlo en el INSERT a profiles:
 (new.raw_user_meta_data ->> 'tenant_id')::uuid

 1.7 Funcion helper

 CREATE FUNCTION current_user_tenant_id() RETURNS UUID AS $$
   SELECT tenant_id FROM profiles WHERE id = auth.uid();
 $$ LANGUAGE sql SECURITY DEFINER STABLE;

 ---
 Fase 2: Middleware - Resolucion de Tenant

 2.1 Cliente Supabase para middleware (Edge Runtime)

 Archivo nuevo: lib/supabase/middleware.ts

 El bug critico: server.ts usa cookies() de next/headers que no funciona en Edge Runtime. Crear
  cliente que use request.cookies directamente.

 2.2 Utilidades de tenant

 Archivo nuevo: lib/tenant/index.ts

 - extractTenantSlug(host): parsea subdominio de Host header
   - Produccion: gimnasio.tuapp.com → gimnasio
   - Dev: gimnasio.localhost:3000 → gimnasio, gimnasio.lvh.me:3000 → gimnasio
   - Root domain: tuapp.com → null
   - Ignora www.
 - getTenantBySlug(slug, request, response): busca en DB usando middleware client
 - APP_ROOT_DOMAIN desde env var
 - Interface Tenant

 2.3 Contexto de tenant server-side

 Archivo nuevo: lib/tenant/server.ts

 - getTenantContext(): lee headers x-tenant-id, x-tenant-slug, x-tenant-name seteados por
 middleware. Opcionalmente consulta tenant completo de DB.

 2.4 Middleware principal

 Archivo modificado: middleware.ts

 Flujo:
 1. updateSession(request) (existente - refresh tokens)
 2. extractTenantSlug(host) - si no hay slug, solo permitir root routes
 3. getTenantBySlug() - si no existe, rewrite a /tenant-not-found
 4. Si user autenticado: consultar profiles.tenant_id y comparar con tenant del subdominio →
 403 si no coincide (fix bug #2: validacion real, no cookie)
 5. Setear headers x-tenant-id, x-tenant-slug, x-tenant-name en response

 2.5 Pagina tenant-not-found

 Archivo nuevo: app/tenant-not-found/page.tsx

 Pagina simple en español: "Este gimnasio no existe o esta inactivo."

 ---
 Fase 3: Flujos de Auth

 3.1 Signup de student con tenant

 Archivo modificado: app/api/auth/sign-up/route.ts

 - Extraer tenantSlug del Host header
 - Validar que el tenant existe y esta activo
 - Incluir tenant_id en user_metadata al crear usuario
 - El trigger handle_new_user() lo lee y crea el profile con tenant_id

 3.2 Creacion de trainer/user por admin

 Archivo modificado: app/api/admin/create-user/route.ts

 - Obtener tenant_id del profile del admin autenticado
 - Incluir ese tenant_id en user_metadata del nuevo usuario
 - Eliminar la opcion de adminSecret (solo sesion admin autenticada)

 3.3 Signup page - pasar tenant context

 Archivo modificado: app/auth/sign-up/page.tsx

 - Mostrar nombre del gimnasio en la pagina de signup (branding)

 ---
 Fase 4: Actualizar Types

 Archivo modificado: lib/types.ts

 - Agregar tenant_id: string a: Profile, Routine, WorkoutDay, Exercise, ExerciseCompletion,
 Comment, RoutineAssignment, TrainerStudent, TrainerNote, BodyMetric
 - Agregar interface Tenant (id, slug, name, description, theme, is_active, etc.)
 - Agregar interface TrainerProfile (id, tenant_id, user_id, bio, specialties, etc.)

 ---
 Fase 5: Actualizar Inserts en Componentes

 Con RLS, los SELECTs se filtran automaticamente. Pero los INSERTs necesitan tenant_id
 explicito.

 Estrategia: En componentes que reciben profile como prop, usar profile.tenant_id.

 Archivos a modificar (inserts):

 1. components/routines/create-routine-form.tsx - routines, workout_days, exercises,
 routine_assignments
 2. components/routines/edit-routine-form.tsx - workout_days, exercises, routine_assignments
 3. components/routines/exercise-card.tsx - exercise_completions, comments
 4. components/routines/routine-viewer.tsx - routine_assignments
 5. components/routines/week-comment-modal.tsx - comments
 6. components/routines/day-comment-modal.tsx - comments
 7. components/students/students-manager.tsx - trainer_students
 8. components/students/student-detail.tsx - trainer_notes, body_metrics, routine_assignments,
 profiles update
 9. components/dashboard/profile-evaluation.tsx - body_metrics, profiles update
 10. components/settings/settings-page.tsx - profiles update

 Patron: Donde el componente ya tiene profile prop → usar profile.tenant_id. Donde no lo tiene
 → propagarlo desde el server component padre.

 ---
 Fase 6: Branding por Tenant

 6.1 Theme provider

 Archivo nuevo: components/providers/tenant-theme-provider.tsx

 Aplica CSS variables (--primary, --secondary) basado en tenant.theme.

 6.2 Layout actualizado

 Archivo modificado: app/layout.tsx

 - Llamar getTenantContext()
 - Envolver children en TenantThemeProvider
 - Title dinamico: tenant.name
 - Favicon dinamico

 6.3 Manifest dinamico

 Archivo nuevo: app/api/manifest/route.ts

 Retorna JSON con name, short_name, theme_color, background_color del tenant.

 6.4 Dashboard layout

 Archivo modificado: app/dashboard/layout.tsx

 Mostrar nombre del gimnasio en el header/sidebar.

 ---
 Fase 7: Variables de Entorno

 Agregar a .env.local:
 APP_ROOT_DOMAIN=tuapp.com

 ---
 Orden de Implementacion

 1. SQL migration (Fase 1) - primero, es la base
 2. Middleware client + tenant utils (Fase 2.1, 2.2, 2.3)
 3. Middleware principal (Fase 2.4, 2.5)
 4. Types (Fase 4)
 5. Auth flows (Fase 3)
 6. Inserts en componentes (Fase 5)
 7. Branding (Fase 6)

 ---
 Verificacion

 Tests manuales con lvh.me

 1. Crear tenant en DB, acceder via tenant.lvh.me:3000
 2. Signup de student → verificar tenant_id correcto en profiles
 3. Login con user de tenant A en subdominio de tenant B → esperar 403
 4. Admin crea trainer → verificar mismo tenant_id
 5. Trainer crea rutina → verificar tenant_id en routine, workout_days, exercises
 6. Student completa ejercicio → verificar tenant_id en completion
 7. Admin dashboard muestra solo datos del tenant

 Test de aislamiento

 1. Crear 2 tenants con datos
 2. User de tenant A no ve routines/students de tenant B
 3. Intentar INSERT con tenant_id incorrecto → rechazado por RLS


 ** Configruar DNS en el deploy **
 Primer paso (antes de venderle a cualquiera)
1) Tener el dominio y el wildcard listos

Configurás DNS para que cualquier subdominio apunte a tu app:

A o CNAME para tuapp.com

Wildcard: *.tuapp.com → tu app

Eso hace que gimnasio_uno.tuapp.com “llegue” a tu frontend/backend sin que tengas que crear subdominios uno por uno.

Si deployás en plataformas tipo Vercel/Cloudflare/Render/Railway, esto se configura una vez y queda.

** Implementacion Realizada **

Resumen de implementacion Multi-Tenant                                                        
                                                                                              
  Fase 1: Migracion SQL (scripts/004_multi_tenant_migration.sql)                                
                                                                                                
  - Tabla tenants con slug, name, theme JSONB, is_active
  - Tabla trainer_profiles con bio, specialties, certifications
  - tenant_id agregado a las 10 tablas existentes con indices
  - Datos existentes migrados a tenant default (gimnasio-default)
  - Todas las columnas tenant_id ahora son NOT NULL
  - RLS reemplazado: de USING (true) a tenant_id = current_user_tenant_id()
  - Trigger handle_new_user() actualizado para leer tenant_id de user_metadata
  - Funcion helper current_user_tenant_id() creada

  Fase 2: Middleware y Tenant Utils

  - lib/tenant/index.ts - extractTenantSlug() parsea subdominios (lvh.me, localhost, produccion)
  - lib/tenant/server.ts - getTenantContext() lee headers x-tenant-*
  - lib/supabase/middleware.ts - cliente Supabase para Edge Runtime
  - middleware.ts reescrito: session refresh + tenant resolution + validacion user-tenant +
  headers

  Fase 3: Auth Flows

  - app/api/auth/sign-up/route.ts - resuelve tenant desde Host, incluye tenant_id en
  user_metadata
  - app/api/admin/create-user/route.ts - toma tenant_id del admin autenticado
  - app/auth/sign-up/page.tsx - muestra nombre del gimnasio en signup

  Fase 4: Types (lib/types.ts)

  - tenant_id agregado a todas las interfaces
  - Nuevas interfaces: Tenant, TrainerProfile

  Fase 5: Inserts en Componentes (10 archivos)

  - tenant_id agregado a todos los .insert() en: create-routine-form, edit-routine-form,
  exercise-card, routine-viewer, week-comment-modal, day-comment-modal, students-manager,
  student-detail, profile-evaluation
  - Props tenantId propagados desde server components

  Fase 6: Branding

  - TenantThemeProvider aplica CSS variables del tenant
  - app/layout.tsx - carga tema del tenant, manifest dinamico
  - app/dashboard/layout.tsx - barra con nombre del gimnasio
  - app/api/manifest/route.ts - manifest PWA dinamico por tenant
  - app/tenant-not-found/page.tsx - pagina de error

  Fase 7: Variables de Entorno

  - APP_ROOT_DOMAIN=lvh.me:3000 y NEXT_PUBLIC_APP_ROOT_DOMAIN=lvh.me:3000 agregados a .env.local

  ** Resolucion de subdominio **

  En produccion

  Cambiarias el env a tu dominio real:
  APP_ROOT_DOMAIN=tuapp.com
  Y los tenants accederian via gimnasio.tuapp.com.

  En resumen

  ┌─────────┬─────────────┬──────────────────────┐
  │ Entorno │   Dominio   │    Ejemplo tenant    │
  ├─────────┼─────────────┼──────────────────────┤
  │ Dev     │ lvh.me:3000 │ gimnasio.lvh.me:3000 │
  ├─────────┼─────────────┼──────────────────────┤
  │ Prod    │ tuapp.com   │ gimnasio.tuapp.com   │
  └─────────┴─────────────┴──────────────────────┘


-- ============================================================                                                 
  -- 1.1 Create tenants table                                                                                     
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    theme jsonb DEFAULT '{}',
    logo_url text,
    email text,
    phone text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
  CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON public.tenants(is_active);

  ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

  -- ============================================================
  -- 1.2 Create trainer_profiles table
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.trainer_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio text,
    specialties text[],
    experience_years int,
    certifications text[],
    rating numeric,
    total_students int DEFAULT 0,
    availability text,
    social_links jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, user_id)
  );

  ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

  -- ============================================================
  -- 1.3 Add tenant_id to all existing tables
  -- ============================================================
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
  CASCADE;
  ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
  CASCADE;
  ALTER TABLE public.workout_days ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
  CASCADE;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
  CASCADE;
  ALTER TABLE public.exercise_completions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON
   DELETE CASCADE;
  ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
  CASCADE;
  ALTER TABLE public.routine_assignments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON
  DELETE CASCADE;
  ALTER TABLE public.trainer_students ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON
  DELETE CASCADE;
  ALTER TABLE public.trainer_notes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
   CASCADE;
  ALTER TABLE public.body_metrics ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE
  CASCADE;

  -- Indexes for tenant_id on each table
  CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_routines_tenant ON public.routines(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_workout_days_tenant ON public.workout_days(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_exercises_tenant ON public.exercises(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_exercise_completions_tenant ON public.exercise_completions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_comments_tenant ON public.comments(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_routine_assignments_tenant ON public.routine_assignments(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_trainer_students_tenant ON public.trainer_students(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_trainer_notes_tenant ON public.trainer_notes(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_body_metrics_tenant ON public.body_metrics(tenant_id);

  run success !

  -- ============================================================
  -- 1.4 Migrate existing data
  -- ============================================================

  -- Create default tenant
  INSERT INTO public.tenants (id, slug, name, description)
  VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'gimnasio-default',
    'Gimnasio Default',
    'Tenant por defecto para datos existentes'
  )
  ON CONFLICT (slug) DO NOTHING;

  -- Assign all existing profiles to default tenant
  UPDATE public.profiles
  SET tenant_id = 'a0000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

  -- Propagate tenant_id to routines via trainer_id
  UPDATE public.routines r
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE r.trainer_id = p.id AND r.tenant_id IS NULL;

  -- Propagate to workout_days via routine
  UPDATE public.workout_days wd
  SET tenant_id = r.tenant_id
  FROM public.routines r
  WHERE wd.routine_id = r.id AND wd.tenant_id IS NULL;

  -- Propagate to exercises via workout_day
  UPDATE public.exercises e
  SET tenant_id = wd.tenant_id
  FROM public.workout_days wd
  WHERE e.workout_day_id = wd.id AND e.tenant_id IS NULL;

  -- Propagate to exercise_completions via student
  UPDATE public.exercise_completions ec
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE ec.student_id = p.id AND ec.tenant_id IS NULL;

  -- Propagate to comments via student
  UPDATE public.comments c
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE c.student_id = p.id AND c.tenant_id IS NULL;

  -- Propagate to routine_assignments via student
  UPDATE public.routine_assignments ra
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE ra.student_id = p.id AND ra.tenant_id IS NULL;

  -- Propagate to trainer_students via trainer
  UPDATE public.trainer_students ts
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE ts.trainer_id = p.id AND ts.tenant_id IS NULL;

  -- Propagate to trainer_notes via trainer
  UPDATE public.trainer_notes tn
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE tn.trainer_id = p.id AND tn.tenant_id IS NULL;

  -- Propagate to body_metrics via student
  UPDATE public.body_metrics bm
  SET tenant_id = p.tenant_id
  FROM public.profiles p
  WHERE bm.student_id = p.id AND bm.tenant_id IS NULL;

  -- Make tenant_id NOT NULL on all tables
  ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.routines ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.workout_days ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.exercises ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.exercise_completions ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.comments ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.routine_assignments ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.trainer_students ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.trainer_notes ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.body_metrics ALTER COLUMN tenant_id SET NOT NULL;

Run success !
  -- ============================================================
  -- 1.7 Helper function
  -- ============================================================
  CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
  RETURNS uuid AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
  $$ LANGUAGE sql SECURITY DEFINER STABLE;

  -- ============================================================
  -- 1.5 Replace RLS policies
  -- ============================================================

  -- Drop all old permissive policies
  DROP POLICY IF EXISTS "profiles_all" ON public.profiles;
  DROP POLICY IF EXISTS "trainer_students_all" ON public.trainer_students;
  DROP POLICY IF EXISTS "routines_all" ON public.routines;
  DROP POLICY IF EXISTS "routine_assignments_all" ON public.routine_assignments;
  DROP POLICY IF EXISTS "workout_days_all" ON public.workout_days;
  DROP POLICY IF EXISTS "exercises_all" ON public.exercises;
  DROP POLICY IF EXISTS "exercise_completions_all" ON public.exercise_completions;
 
  DROP POLICY IF EXISTS "comments_all" ON public.comments;
  DROP POLICY IF EXISTS "trainer_notes_all" ON public.trainer_notes;
  DROP POLICY IF EXISTS "body_metrics_all" ON public.body_metrics;

  -- TENANTS policies
  CREATE POLICY "tenants_select" ON public.tenants
    FOR SELECT TO authenticated
    USING (id = public.current_user_tenant_id());

  CREATE POLICY "tenants_update_admin" ON public.tenants
    FOR UPDATE TO authenticated
    USING (
      id = public.current_user_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );

  -- PROFILES policies
  CREATE POLICY "profiles_select_tenant" ON public.profiles
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

  CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  -- ROUTINES policies
  CREATE POLICY "routines_select_tenant" ON public.routines
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "routines_insert_tenant" ON public.routines
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "routines_update_tenant" ON public.routines
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "routines_delete_tenant" ON public.routines
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- WORKOUT_DAYS policies
  CREATE POLICY "workout_days_select_tenant" ON public.workout_days
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "workout_days_insert_tenant" ON public.workout_days
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "workout_days_update_tenant" ON public.workout_days
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "workout_days_delete_tenant" ON public.workout_days
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- EXERCISES policies
  CREATE POLICY "exercises_select_tenant" ON public.exercises
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "exercises_insert_tenant" ON public.exercises
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "exercises_update_tenant" ON public.exercises
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "exercises_delete_tenant" ON public.exercises
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- EXERCISE_COMPLETIONS policies
  CREATE POLICY "exercise_completions_select_tenant" ON public.exercise_completions
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "exercise_completions_insert_tenant" ON public.exercise_completions
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "exercise_completions_update_tenant" ON public.exercise_completions
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "exercise_completions_delete_tenant" ON public.exercise_completions
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- COMMENTS policies
  CREATE POLICY "comments_select_tenant" ON public.comments
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "comments_insert_tenant" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "comments_update_tenant" ON public.comments
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "comments_delete_tenant" ON public.comments
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- ROUTINE_ASSIGNMENTS policies
  CREATE POLICY "routine_assignments_select_tenant" ON public.routine_assignments
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "routine_assignments_insert_tenant" ON public.routine_assignments
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "routine_assignments_update_tenant" ON public.routine_assignments
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "routine_assignments_delete_tenant" ON public.routine_assignments
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- TRAINER_STUDENTS policies
  CREATE POLICY "trainer_students_select_tenant" ON public.trainer_students
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "trainer_students_insert_tenant" ON public.trainer_students
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "trainer_students_update_tenant" ON public.trainer_students
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "trainer_students_delete_tenant" ON public.trainer_students
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- TRAINER_NOTES policies
  CREATE POLICY "trainer_notes_select_tenant" ON public.trainer_notes
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "trainer_notes_insert_tenant" ON public.trainer_notes
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "trainer_notes_update_tenant" ON public.trainer_notes
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "trainer_notes_delete_tenant" ON public.trainer_notes
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- BODY_METRICS policies
  CREATE POLICY "body_metrics_select_tenant" ON public.body_metrics
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "body_metrics_insert_tenant" ON public.body_metrics
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "body_metrics_update_tenant" ON public.body_metrics
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  CREATE POLICY "body_metrics_delete_tenant" ON public.body_metrics
    FOR DELETE TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

  -- TRAINER_PROFILES policies
  CREATE POLICY "trainer_profiles_select_tenant" ON public.trainer_profiles
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id());

Run success !

  CREATE POLICY "trainer_profiles_insert_admin" ON public.trainer_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
      tenant_id = public.current_user_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'trainer')
      )
    );

  CREATE POLICY "trainer_profiles_update_own" ON public.trainer_profiles
    FOR UPDATE TO authenticated
    USING (
      tenant_id = public.current_user_tenant_id()
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    );

  -- ============================================================
  -- 1.6 Update handle_new_user() trigger
  -- ============================================================
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
    VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario'),
      coalesce(new.raw_user_meta_data ->> 'role', 'student'),
      (new.raw_user_meta_data ->> 'tenant_id')::uuid
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
  $$;

  Run success !