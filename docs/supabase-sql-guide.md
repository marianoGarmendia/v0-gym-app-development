# Mini Curso: SQL en Supabase (PostgreSQL)

Basado en lo que usamos en este proyecto.

---

## 1. COALESCE — "Dame el primer valor que no sea NULL"

```sql
SELECT COALESCE(valor1, valor2, valor3);
```

Evalua de izquierda a derecha y devuelve el **primer valor que NO sea NULL**.

```sql
-- Ejemplo simple:
SELECT COALESCE(NULL, NULL, 'hola');  -- Devuelve: 'hola'
SELECT COALESCE('chau', 'hola');      -- Devuelve: 'chau'
SELECT COALESCE(NULL, 42);            -- Devuelve: 42

-- Como lo usamos en el proyecto:
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    -- Intento 1: leer del JWT (usuarios nuevos)
    (auth.jwt() -> 'app_metadata' ->> 'active_tenant_id')::uuid,
    -- Intento 2: fallback a profiles (usuarios viejos)
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```



Si el JWT tiene `active_tenant_id`, usa ese. Si no (NULL), busca en profiles.
Esto nos da **backward compatibility**: los usuarios viejos siguen funcionando.

---

## 2. Funciones de Supabase Auth (disponibles en SQL)

```sql
auth.uid()          -- UUID del usuario autenticado actual
auth.jwt()          -- El JWT completo como JSON
auth.role()         -- El rol del JWT ('authenticated', 'anon', 'service_role')
```

### Acceder a datos del JWT:

```sql
-- Operador ->  devuelve JSON (objeto)
-- Operador ->> devuelve TEXT (string)

auth.jwt() -> 'app_metadata'                    -- JSON: {"active_tenant_id": "xxx"}
auth.jwt() -> 'app_metadata' ->> 'active_tenant_id'  -- TEXT: "xxx"

-- Si necesitas UUID, casteas con ::uuid
(auth.jwt() -> 'app_metadata' ->> 'active_tenant_id')::uuid
```

### Diferencia entre `->` y `->>`:
```sql
-- ->  mantiene el tipo JSON (para seguir navegando)
'{"a": {"b": 1}}' -> 'a' -> 'b'     -- JSON: 1

-- ->> extrae como TEXT (para comparar o castear)
'{"a": {"b": 1}}' -> 'a' ->> 'b'    -- TEXT: '1'
```

---

## 3. Triggers — "Ejecuta esto cuando pase algo"

```sql
-- Paso 1: Crear la funcion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger                    -- Tipo especial para triggers
LANGUAGE plpgsql                   -- Lenguaje procedural (permite IF, variables, etc.)
SECURITY DEFINER                   -- Se ejecuta con permisos del CREADOR, no del usuario
SET search_path = public           -- Evita ataques de search_path
AS $$
DECLARE
  _tenant_id uuid;                 -- Variable local
BEGIN
  -- "new" es el registro que se acaba de insertar en auth.users
  _tenant_id := (new.raw_user_meta_data ->> 'tenant_id')::uuid;

  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (new.id, new.email, 'Usuario', 'student', _tenant_id);

  RETURN new;                      -- Obligatorio en triggers
END;
$$;

-- Paso 2: Conectar la funcion a un evento
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users       -- Despues de insertar en auth.users
  FOR EACH ROW                     -- Por cada fila insertada
  EXECUTE FUNCTION public.handle_new_user();
```

### Variables especiales en triggers:
- `new` — el registro NUEVO (disponible en INSERT y UPDATE)
- `old` — el registro ANTERIOR (disponible en UPDATE y DELETE)

---

## 4. RLS (Row Level Security) — "Quien puede ver/tocar que"

### Activar RLS:
```sql
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
```

**Con RLS activado, NADIE puede acceder a la tabla** (excepto `service_role`).
Hay que crear POLICIES para dar acceso.

### Crear policies:
```sql
-- Estructura:
CREATE POLICY "nombre_descriptivo" ON public.tabla
  FOR SELECT|INSERT|UPDATE|DELETE    -- Que operacion
  TO authenticated|anon              -- Que rol de Supabase
  USING (condicion)                  -- Filtro para leer (SELECT/UPDATE/DELETE)
  WITH CHECK (condicion);            -- Filtro para escribir (INSERT/UPDATE)

-- Ejemplos del proyecto:

-- 1. Todos ven solo datos de su tenant:
CREATE POLICY "profiles_select_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_user_tenant_id());
  -- "Solo podes ver profiles que tengan tu mismo tenant_id"

-- 2. Solo el propio usuario puede editar su perfil:
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())            -- Que filas puede ver para update
  WITH CHECK (id = auth.uid());      -- Que filas puede escribir

-- 3. Anon puede ver tenants activos (para login/signup):
CREATE POLICY "tenants_select_anon" ON public.tenants
  FOR SELECT TO anon
  USING (is_active = true);

-- 4. Solo admins pueden hacer algo:
CREATE POLICY "tenants_update_admin" ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    id = public.current_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### USING vs WITH CHECK:
- **USING** → filtra que filas podes VER (SELECT, y cuales UPDATE/DELETE)
- **WITH CHECK** → valida que lo que ESCRIBIS cumple la condicion (INSERT, UPDATE)

### Roles de Supabase:
- `anon` — usuario no logueado (usa la anon key)
- `authenticated` — usuario logueado
- `service_role` — admin total (BYPASSES RLS, solo usar en backend)

---

## 5. ON CONFLICT — "Si ya existe, hace esto"

```sql
-- Insertar, pero si ya existe la combinacion (user_id, tenant_id), no hacer nada:
INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
VALUES ('uuid-1', 'uuid-2', 'student')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Insertar o actualizar (UPSERT):
INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
VALUES ('uuid-1', 'uuid-2', 'trainer')
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;
-- EXCLUDED es el registro que intentaste insertar
```

Requiere un constraint UNIQUE en las columnas que mencionas.

---

## 6. CREATE FUNCTION — "Funciones reutilizables"

### SQL puro (una sola expresion):
```sql
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### PL/pgSQL (logica compleja):
```sql
CREATE OR REPLACE FUNCTION public.mi_funcion(param1 text, param2 int)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  resultado text;
BEGIN
  IF param2 > 10 THEN
    resultado := param1 || ' es grande';
  ELSE
    resultado := param1 || ' es chico';
  END IF;
  RETURN resultado;
END;
$$;
```

### Modificadores importantes:
- `SECURITY DEFINER` — ejecuta con permisos del que creo la funcion (como sudo)
- `SECURITY INVOKER` — ejecuta con permisos del que la llama (default)
- `STABLE` — promete que no modifica datos (optimizacion)
- `VOLATILE` — puede modificar datos (default)

---

## 7. Casteo de tipos — `::`

```sql
'123'::int                    -- Text a Integer
'2024-01-01'::date            -- Text a Date
'uuid-string'::uuid           -- Text a UUID
mi_columna::text              -- Cualquier tipo a Text

-- Equivalente a:
CAST('123' AS int)
```

---

## 8. Operadores JSON en PostgreSQL

```sql
-- Dada la columna theme de tipo JSONB:
-- theme = '{"primary": "#ff0000", "mode": "dark"}'

theme -> 'primary'            -- JSON: "#ff0000"  (sigue siendo JSON)
theme ->> 'primary'           -- TEXT: #ff0000    (texto plano)

-- JSON anidado:
-- data = '{"user": {"name": "Juan", "age": 25}}'
data -> 'user' ->> 'name'    -- TEXT: Juan
data -> 'user' -> 'age'      -- JSON: 25

-- raw_user_meta_data del proyecto:
new.raw_user_meta_data ->> 'tenant_id'    -- TEXT: "uuid-del-tenant"
(new.raw_user_meta_data ->> 'tenant_id')::uuid  -- UUID
```

---

## 9. DROP IF EXISTS — "Borra si existe, sino no hagas nada"

```sql
DROP POLICY IF EXISTS "nombre" ON public.tabla;
DROP TABLE IF EXISTS public.tabla;
DROP FUNCTION IF EXISTS public.mi_funcion();
DROP INDEX IF EXISTS idx_nombre;
-- Evita errores si el objeto no existe (migraciones idempotentes)
```

---

## 10. Patron comun: Migracion segura

```sql
-- 1. Crear tabla (idempotente)
CREATE TABLE IF NOT EXISTS public.nueva_tabla (...);

-- 2. Crear indexes
CREATE INDEX IF NOT EXISTS idx_nombre ON public.nueva_tabla(columna);

-- 3. Activar RLS
ALTER TABLE public.nueva_tabla ENABLE ROW LEVEL SECURITY;

-- 4. Migrar datos existentes (idempotente)
INSERT INTO public.nueva_tabla (...)
SELECT ... FROM public.tabla_vieja
ON CONFLICT ... DO NOTHING;

-- 5. Actualizar funciones (CREATE OR REPLACE es idempotente)
CREATE OR REPLACE FUNCTION public.mi_funcion() ...;

-- 6. Recrear policies (DROP + CREATE)
DROP POLICY IF EXISTS "nombre" ON public.tabla;
CREATE POLICY "nombre" ON public.tabla ...;
```

La idea es que puedas ejecutar la migracion **multiples veces** sin que falle.

---

## Resumen rapido de sintaxis

| Sintaxis | Que hace |
|---|---|
| `COALESCE(a, b)` | Primer valor no NULL |
| `auth.uid()` | UUID del usuario logueado |
| `auth.jwt() -> 'key'` | Acceder al JWT (JSON) |
| `->>` | Extraer como TEXT |
| `->` | Extraer como JSON |
| `::tipo` | Castear tipo |
| `ON CONFLICT DO NOTHING` | Ignorar si duplicado |
| `USING (...)` | Filtro RLS para lectura |
| `WITH CHECK (...)` | Filtro RLS para escritura |
| `SECURITY DEFINER` | Ejecutar como creador |
| `IF NOT EXISTS` / `IF EXISTS` | Migracion idempotente |
| `new` / `old` | Registro nuevo/viejo en trigger |
