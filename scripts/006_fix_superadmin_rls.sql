-- ============================================================
-- 006: Fix superadmin RLS recursion
-- The superadmin_select_all_profiles policy caused infinite
-- recursion because it queried profiles to check the role.
-- Solution: SECURITY DEFINER function that bypasses RLS.
-- ============================================================

-- 1. Create helper function (bypasses RLS)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'superadmin'
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "superadmin_select_all_profiles" ON profiles;

-- 3. Recreate with the safe function
CREATE POLICY "superadmin_select_all_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- 4. Also fix tenants policies to use the function
DROP POLICY IF EXISTS "superadmin_select_tenants" ON tenants;
DROP POLICY IF EXISTS "superadmin_insert_tenants" ON tenants;
DROP POLICY IF EXISTS "superadmin_update_tenants" ON tenants;
DROP POLICY IF EXISTS "superadmin_delete_tenants" ON tenants;

CREATE POLICY "superadmin_select_tenants" ON tenants
  FOR SELECT TO authenticated
  USING (is_superadmin());

CREATE POLICY "superadmin_insert_tenants" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "superadmin_update_tenants" ON tenants
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "superadmin_delete_tenants" ON tenants
  FOR DELETE TO authenticated
  USING (is_superadmin());
