-- ============================================================
-- 005: Super-Admin support
-- ============================================================

-- 1. Add new columns to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS max_students integer NOT NULL DEFAULT 50;

-- 2. Create platform tenant (superadmin belongs here)
INSERT INTO tenants (slug, name, description, is_active, plan, payment_status, max_students)
VALUES ('platform', 'Plataforma', 'Tenant interno de la plataforma', true, 'platform', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

-- 3. Update role CHECK constraint to include 'superadmin'
-- First drop the existing constraint, then recreate it
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'trainer', 'student', 'superadmin'));

-- 4. RLS policies for superadmin on tenants table
-- Superadmin can see all tenants
CREATE POLICY "superadmin_select_tenants" ON tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can insert tenants
CREATE POLICY "superadmin_insert_tenants" ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can update tenants
CREATE POLICY "superadmin_update_tenants" ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can delete (deactivate) tenants
CREATE POLICY "superadmin_delete_tenants" ON tenants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- 5. Superadmin can read all profiles (cross-tenant)
CREATE POLICY "superadmin_select_all_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
        AND p.role = 'superadmin'
    )
  );

-- Run success !

-- ============================================================
-- MANUAL STEP: Set your user as superadmin
-- Replace YOUR_USER_ID with your actual auth.users.id
-- Also set the tenant_id to the platform tenant id:
--
-- UPDATE profiles
-- SET role = 'superadmin',
--     tenant_id = (SELECT id FROM tenants WHERE slug = 'platform')
-- WHERE id = 'YOUR_USER_ID';
-- ============================================================

--            Crear usuario   superadmin                                                                                    
--   UPDATE profiles                                                                               
--   SET role = 'superadmin',                                                                      
--       tenant_id = (SELECT id FROM tenants WHERE slug = 'platform')                              
--   WHERE email = 'TU_EMAIL_AQUI';                                                                

--   Reemplazá TU_EMAIL_AQUI con el email con el que te registraste.

--   Pasos:
--   1. Abrí tu proyecto en app.supabase.com
--   2. Andá a SQL Editor (ícono en el sidebar izquierdo)
--   3. Pegá la query con tu email
--   4. Click en Run

--   Si no sabés tu email exacto, podés primero buscar tu usuario:

--   SELECT id, email, role, tenant_id FROM profiles;

--   Después de ejecutarlo, ya podés ir a lvh.me:3000/super-admin y debería cargar el panel.

-- ❯ me tengo que registrar desde el signup general? desde al admin?                               
                                                                  
-- ● No necesitás registrarte de nuevo. Usá un usuario que ya tengas. El proceso es:               
                                         
--   1. Elegí un usuario existente (el que venís usando para desarrollar)                          
--   2. En el SQL Editor de Supabase, ejecutá:                 
                                                                                                
--   -- Primero mirá qué usuarios tenés                                                            
--   SELECT id, email, role, tenant_id FROM profiles;

--   3. Con el email de tu usuario, actualizá el rol:

--   UPDATE profiles
--   SET role = 'superadmin',
--       tenant_id = (SELECT id FROM tenants WHERE slug = 'platform')
--   WHERE email = 'tu-email@ejemplo.com';

--   4. Andá a lvh.me:3000/auth/login (root domain, sin subdominio) e iniciá sesión con ese mismo
--   email y contraseña
--   5. Después navegá a lvh.me:3000/super-admin

--   En resumen: no te registrás de nuevo, solo cambiás el rol de un usuario existente por SQL.
