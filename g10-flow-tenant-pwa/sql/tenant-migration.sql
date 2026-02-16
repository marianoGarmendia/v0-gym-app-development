-- ============================================
-- Migración Multi-Tenant para G10 Flow
-- ============================================
-- Este script crea las tablas necesarias para el sistema multi-tenant
-- y actualiza las tablas existentes para incluir tenant_id

-- ============================================
-- 1. Crear tabla de tenants
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuración de tema
  theme JSONB DEFAULT '{
    "primaryColor": "#f97316",
    "secondaryColor": "#1c1c1c",
    "logoUrl": null,
    "faviconUrl": null
  }'::jsonb,
  
  -- Configuración del tenant
  settings JSONB DEFAULT '{
    "allowPublicSignup": true,
    "requireInviteCode": false,
    "defaultTrainerRole": "trainer"
  }'::jsonb,
  
  -- Contacto
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Plan y suscripción
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended', 'cancelled')),
  subscription_ends_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- ============================================
-- 2. Crear tabla de invites (códigos de invitación)
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'trainer')),
  email TEXT, -- Opcional: pre-asignar a un email específico
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_tenant_id ON invites(tenant_id);

-- ============================================
-- 3. Actualizar tabla profiles para incluir tenant_id
-- ============================================
-- Nota: Esto asume que ya existe la tabla profiles
-- Si no existe, créala primero con el tenant_id incluido

-- Agregar columna tenant_id a profiles (si no existe)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Agregar índice
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- ============================================
-- 4. Crear tabla de trainer_profiles (perfil extendido de entrenadores)
-- ============================================
CREATE TABLE IF NOT EXISTS trainer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Información profesional
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  experience_years INTEGER,
  certifications TEXT[] DEFAULT '{}',
  
  -- Métricas
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  total_students INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  
  -- Disponibilidad y ubicación
  availability TEXT,
  location TEXT,
  
  -- Redes sociales
  social_links JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_trainer_profiles_tenant_id ON trainer_profiles(tenant_id);
CREATE INDEX idx_trainer_profiles_user_id ON trainer_profiles(user_id);

-- ============================================
-- 5. Crear tabla de student_profiles (perfil extendido de alumnos)
-- ============================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Información de entrenamiento
  objective TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Salud
  injuries TEXT,
  medical_notes TEXT,
  
  -- Preferencias
  desired_frequency INTEGER, -- veces por semana
  preferred_days INTEGER[] DEFAULT '{}', -- 0=domingo, 1=lunes, etc.
  preferred_time_start TIME,
  preferred_time_end TIME,
  
  -- Notas del entrenador
  trainer_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_student_profiles_tenant_id ON student_profiles(tenant_id);
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);

-- ============================================
-- 6. Actualizar tablas existentes para incluir tenant_id
-- ============================================

-- Routines
ALTER TABLE routines 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_routines_tenant_id ON routines(tenant_id);

-- Workout days
ALTER TABLE workout_days 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workout_days_tenant_id ON workout_days(tenant_id);

-- Exercises
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exercises_tenant_id ON exercises(tenant_id);

-- Exercise completions
ALTER TABLE exercise_completions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exercise_completions_tenant_id ON exercise_completions(tenant_id);

-- Comments
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_tenant_id ON comments(tenant_id);

-- Trainer students
ALTER TABLE trainer_students 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trainer_students_tenant_id ON trainer_students(tenant_id);

-- Routine assignments
ALTER TABLE routine_assignments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_routine_assignments_tenant_id ON routine_assignments(tenant_id);

-- Body metrics
ALTER TABLE body_metrics 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_body_metrics_tenant_id ON body_metrics(tenant_id);

-- Trainer notes
ALTER TABLE trainer_notes 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trainer_notes_tenant_id ON trainer_notes(tenant_id);

-- ============================================
-- 7. Crear función para actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para tenants
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers para trainer_profiles
DROP TRIGGER IF EXISTS update_trainer_profiles_updated_at ON trainer_profiles;
CREATE TRIGGER update_trainer_profiles_updated_at
  BEFORE UPDATE ON trainer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers para student_profiles
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Políticas RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propio tenant
CREATE POLICY "Users can view their tenant"
  ON tenants FOR SELECT
  USING (id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- Política: Solo admins pueden modificar su tenant
CREATE POLICY "Admins can update their tenant"
  ON tenants FOR UPDATE
  USING (id IN (
    SELECT tenant_id FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Habilitar RLS en trainer_profiles
ALTER TABLE trainer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trainer profiles in their tenant"
  ON trainer_profiles FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- Habilitar RLS en student_profiles
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own student profile"
  ON student_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can view student profiles in their tenant"
  ON student_profiles FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'trainer'
    )
  );

CREATE POLICY "Users can update their own student profile"
  ON student_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Habilitar RLS en invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view valid invites by code"
  ON invites FOR SELECT
  USING (
    code IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses)
  );

CREATE POLICY "Admins can manage invites in their tenant"
  ON invites FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- 9. Insertar tenant de ejemplo (opcional)
-- ============================================
-- Descomenta esto para crear un tenant de prueba
/*
INSERT INTO tenants (slug, name, description, email)
VALUES (
  'gimnasio-demo',
  'Gimnasio Demo',
  'Gimnasio de demostración para pruebas',
  'demo@gimnasio.com'
)
ON CONFLICT (slug) DO NOTHING;
*/

-- ============================================
-- 10. Función para validar invite code
-- ============================================
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_code TEXT,
  p_tenant_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  role TEXT,
  message TEXT
) AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Buscar el invite
  SELECT * INTO v_invite
  FROM invites
  WHERE code = p_code
    AND tenant_id = p_tenant_id;
  
  -- Validar
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Código de invitación no encontrado'::TEXT;
    RETURN;
  END IF;
  
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'El código de invitación ha expirado'::TEXT;
    RETURN;
  END IF;
  
  IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'El código de invitación ya ha sido usado'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_invite.role, 'Código válido'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. Función para usar un invite code
-- ============================================
CREATE OR REPLACE FUNCTION use_invite_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite
  FROM invites
  WHERE code = p_code;
  
  IF v_invite IS NULL THEN
    RETURN false;
  END IF;
  
  -- Incrementar contador de usos
  UPDATE invites
  SET 
    used_count = used_count + 1,
    used_at = NOW()
  WHERE id = v_invite.id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
