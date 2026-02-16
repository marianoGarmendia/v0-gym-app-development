-- Migration: Multi-tenant support with subdomain-based tenant isolation
-- Adds tenants table, trainer_profiles, tenant_id to all tables, RLS policies

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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.workout_days ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.exercise_completions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.routine_assignments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.trainer_students ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.trainer_notes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.body_metrics ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

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
DROP POLICY IF EXISTS "day_comments_all" ON public.day_comments;
DROP POLICY IF EXISTS "week_comments_all" ON public.week_comments;
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
