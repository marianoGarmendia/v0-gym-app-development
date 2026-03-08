-- Migration: Tenant memberships for multi-tenant user support
-- Allows a single auth.users email to be registered in multiple tenants
-- Uses app_metadata.active_tenant_id in JWT for RLS tenant isolation

-- ============================================================
-- 1. Create tenant_memberships table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON public.tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON public.tenant_memberships(tenant_id);

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Populate from existing profiles
-- ============================================================
INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
SELECT id, tenant_id, role FROM public.profiles WHERE tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================
-- 3. Update current_user_tenant_id() to read from JWT app_metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'active_tenant_id')::uuid,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. Update handle_new_user() to also create membership
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _role text;
BEGIN
  _tenant_id := (new.raw_user_meta_data ->> 'tenant_id')::uuid;
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'student');

  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario'),
    _role,
    _tenant_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create tenant membership
  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
    VALUES (new.id, _tenant_id, _role)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- ============================================================
-- 5. RLS policies for tenant_memberships
-- ============================================================

-- Users can see their own memberships
CREATE POLICY "memberships_select_own" ON public.tenant_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only service_role can insert/update/delete (handled via admin client)
-- No additional policies needed for insert/update/delete as service_role bypasses RLS

-- ============================================================
-- 6. Allow anon to SELECT active tenants (for signup/login resolution)
-- ============================================================
DROP POLICY IF EXISTS "tenants_select_anon" ON public.tenants;
CREATE POLICY "tenants_select_anon" ON public.tenants
  FOR SELECT TO anon
  USING (is_active = true);

-- Run success - run in sql editor!