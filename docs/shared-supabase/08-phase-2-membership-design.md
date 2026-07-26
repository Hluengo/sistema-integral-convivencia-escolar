# Fase 2 — Diseño de `applications` y `app_memberships`

> **Status:** ✅ Fase 2 completada  
> **Fecha:** 2026-07-28  
> **Depende de:** Fase 0.5b (profiles nullable, canonical auth trigger)  
> **Drive:** Separación de autorización por aplicación en el proyecto Supabase compartido  
> **Cierre:** Ver `12-phase-2-closure.md`

---

## 1. Resumen ejecutivo

Actualmente la autorización se basa exclusivamente en `profiles.role`, una columna con constraint `CHECK` que lista 9 roles planos. Esto funciona para una sola aplicación, pero el proyecto Supabase compartido alberga dos aplicaciones — **Convivencia Escolar** e **Inasistencias** — que requieren modelos de permisos distintos.

Fase 2 introduce dos tablas:

- **`applications`** — catálogo de aplicaciones registradas en el ecosistema.
- **`app_memberships`** — membresías de usuarios por aplicación, tenant y rol.

Cada usuario puede tener roles diferentes en cada aplicación (ej. `profesor_jefe` en Convivencia, `teacher` en Inasistencias). La tabla `profiles.role` se mantiene como vista de compatibilidad _read-only_ durante la transición, pero dejará de ser la fuente de verdad.

---

## 2. Diseño rationale

### 2.1 Problema actual

Una sola columna `profiles.role` no puede representar:

- Un `profesor_jefe` que es `teacher` en Inasistencias.
- Un `teacher` que no debería tener acceso a Convivencia.
- Un `inspector` con permisos distintos en cada app.

### 2.2 Solución

`app_memberships` es una tabla de unión (join table) que relaciona `(tenant_id, user_id, application_code)` con un `role`. Esto permite:

- **Roles separados por app:** cada aplicación define su propia semántica de roles.
- **Herencia plana:** la transición desde `profiles.role` es directa: se lee el rol actual, se determina a qué app(s) pertenece, y se inserta el membership.
- **Sin herencia compleja:** no hay jerarquías de roles ni herencia entre apps. Cada membership es explícita.

### 2.3 Principios

| Principio             | Aplica                                                     |
| --------------------- | ---------------------------------------------------------- |
| Forward-only          | No hay rollback de datos; solo se agregan tablas           |
| No duplicación        | `profiles.role` se conserva como compatibilidad            |
| Manual over automatic | Backfill reporta ambigüedades, no las resuelve             |
| Source of truth       | `app_memberships` es la fuente de verdad después de Fase 2 |
| Fail closed           | Sin membership → sin acceso                                |

---

## 3. Definiciones de tablas

### 3.1 `public.applications`

| Columna      | Tipo                                 | Descripción                                          |
| ------------ | ------------------------------------ | ---------------------------------------------------- |
| `code`       | `TEXT PK`                            | Identificador corto (`convivencia`, `inasistencias`) |
| `name`       | `TEXT NOT NULL`                      | Nombre legible                                       |
| `is_active`  | `BOOLEAN NOT NULL DEFAULT true`      | Permite deshabilitar una app sin borrar membresías   |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |                                                      |

```sql
CREATE TABLE public.applications (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 `public.app_memberships`

| Columna            | Tipo                                          | Descripción                                                                 |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| `id`               | `UUID PK DEFAULT gen_random_uuid()`           |                                                                             |
| `tenant_id`        | `UUID NOT NULL REFERENCES tenants(id)`        | Tenant al que pertenece la membresía                                        |
| `user_id`          | `UUID NOT NULL REFERENCES auth.users(id)`     | Usuario                                                                     |
| `application_code` | `TEXT NOT NULL REFERENCES applications(code)` | App a la que aplica                                                         |
| `role`             | `TEXT NOT NULL`                               | Rol dentro de la app (sin constraint CHECK — cada app valida por su cuenta) |
| `is_active`        | `BOOLEAN NOT NULL DEFAULT true`               | Permite desactivar temporalmente                                            |
| `created_at`       | `TIMESTAMPTZ NOT NULL DEFAULT now()`          |                                                                             |
| `updated_at`       | `TIMESTAMPTZ NOT NULL DEFAULT now()`          |                                                                             |

**Unique constraint:** `UNIQUE (tenant_id, user_id, application_code)` — un usuario solo puede tener un rol por app por tenant.

```sql
CREATE TABLE public.app_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  application_code TEXT NOT NULL REFERENCES public.applications(code),
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, application_code)
);
```

---

## 4. Mapeo rol → aplicación

Cada rol actual de `profiles.role` se asigna a una o más aplicaciones según la función que cumple en la realidad:

| Rol actual      | ¿Existe en Convivencia? | ¿Existe en Inasistencias? | Lógica de negocio                                    |
| --------------- | ----------------------- | ------------------------- | ---------------------------------------------------- |
| `admin`         | `admin`                 | `admin`                   | Superadmin técnico, necesita acceso completo a ambas |
| `direccion`     | `direccion`             | —                         | Directivos solo gestionan convivencia                |
| `convivencia`   | `convivencia`           | —                         | Encargado de convivencia, solo su app                |
| `inspectoria`   | `inspectoria`           | `inspectoria`             | Inspectoría general actúa en ambas                   |
| `profesor_jefe` | `profesor_jefe`         | `teacher`                 | PJ hace anotaciones en convivencia y pasa asistencia |
| `teacher`       | —                       | `teacher`                 | Profesor solo pasa asistencia                        |
| `inspector`     | `inspector`             | `inspector`               | Inspector de pasillo en ambas                        |
| `user`          | `user`                  | `user`                    | Usuario genérico en ambas                            |
| `staff`         | `staff`                 | `staff`                   | Staff administrativo en ambas                        |

---

## 5. Matriz de transición

| Rol actual      | Convivencia     | Inasistencias | Categoría backfill                 |
| --------------- | --------------- | ------------- | ---------------------------------- |
| `admin`         | `admin`         | `admin`       | `both-apps` ✅ automático          |
| `direccion`     | `direccion`     | —             | `convivencia-only` ✅ automático   |
| `convivencia`   | `convivencia`   | —             | `convivencia-only` ✅ automático   |
| `inspectoria`   | `inspectoria`   | `inspectoria` | `ambiguous` ⚠️ requiere revisión   |
| `profesor_jefe` | `profesor_jefe` | `teacher`     | `ambiguous` ⚠️ requiere revisión   |
| `teacher`       | —               | `teacher`     | `inasistencias-only` ✅ automático |
| `inspector`     | `inspector`     | `inspector`   | `ambiguous` ⚠️ requiere revisión   |
| `user`          | `user`          | `user`        | `ambiguous` ⚠️ requiere revisión   |
| `staff`         | `staff`         | `staff`       | `ambiguous` ⚠️ requiere revisión   |
| `NULL`          | —               | —             | `no-role` ❌ no asignable          |

**Criterio de ambigüedad:** roles que podrían pertenecer a ambas apps pero cuyo intento real depende del contexto del establecimiento.

---

## 6. Estrategia de backfill

### 6.1 Principios

1. **No automático si es ambiguo.** Los `ambiguous` se reportan, no se asignan.
2. **Report-only.** La migración genera una vista `membership_readiness` que clasifica cada usuario.
3. **Dos fases de inserción:** primero los no ambiguos (ambas migraciones separadas), luego revisión manual de ambiguos.
4. **Sin pérdida de datos actuales.** `profiles.role` no se modifica.

### 6.2 Categorías

| Categoría            | Automático | Apps a insertar             |
| -------------------- | ---------- | --------------------------- |
| `both-apps`          | ✅         | convivencia + inasistencias |
| `convivencia-only`   | ✅         | solo convivencia            |
| `inasistencias-only` | ✅         | solo inasistencias          |
| `ambiguous`          | ❌         | ninguna; se reporta         |
| `no-tenant`          | ❌         | ninguna; perfil huérfano    |
| `no-role`            | ❌         | ninguna; sin rol asignado   |

### 6.3 Vista de diagnóstico

```sql
CREATE OR REPLACE VIEW public.membership_readiness AS
SELECT
  p.user_id,
  p.tenant_id,
  p.role AS current_role,
  CASE
    WHEN p.tenant_id IS NULL THEN 'no-tenant'
    WHEN p.role IS NULL THEN 'no-role'
    WHEN p.role IN ('admin') THEN 'both-apps'
    WHEN p.role IN ('direccion', 'convivencia') THEN 'convivencia-only'
    WHEN p.role = 'teacher' THEN 'inasistencias-only'
    WHEN p.role IN ('profesor_jefe', 'inspectoria', 'inspector', 'staff', 'user') THEN 'ambiguous'
    ELSE 'unknown'
  END AS membership_category
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL;
```

### 6.4 Query de resumen por tenant

```sql
SELECT
  p.tenant_id,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE p.role IS NOT NULL) as with_role,
  COUNT(*) FILTER (WHERE p.role IS NULL) as without_role,
  COUNT(*) FILTER (WHERE p.tenant_id IS NULL) as without_tenant,
  COUNT(*) FILTER (WHERE p.role IN ('admin','direccion','convivencia')) as convivencia_only_candidates,
  COUNT(*) FILTER (WHERE p.role = 'teacher') as inasistencias_only_candidates,
  COUNT(*) FILTER (WHERE p.role IN ('profesor_jefe','inspectoria','inspector','staff','user')) as ambiguous
FROM profiles p
GROUP BY p.tenant_id;
```

### 6.5 Procedimiento manual para ambiguos

1. Ejecutar `SELECT * FROM public.membership_readiness WHERE membership_category = 'ambiguous'`
2. Para cada usuario ambiguo, determinar si pertenece a Convivencia, Inasistencias o ambas.
3. Insertar membresías manualmente:
   ```sql
   INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
   VALUES ('<tenant_id>', '<user_id>', 'convivencia', '<role>');
   INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
   VALUES ('<tenant_id>', '<user_id>', 'inasistencias', '<role>');
   ```

---

## 7. Plan de migración (forward-only)

### Paso 1: Crear `applications`

- Migración `20260728000001_create_applications.sql`
- Tabla catálogo, sin dependencias externas.

### Paso 2: Crear `app_memberships`

- Migración `20260728000002_create_app_memberships.sql`
- Depende de `tenants`, `auth.users`, `applications`.
- Índices en `tenant_id`, `user_id`, `application_code`.

### Paso 3: Sembrar aplicaciones

- Migración `20260728000003_seed_applications.sql`
- `convivencia` e `inasistencias`.

### Paso 4: Vista de readiness

- Migración `20260728000004_prepare_membership_backfill.sql`
- `CREATE OR REPLACE VIEW public.membership_readiness`.

### Paso 5: Backfill Inasistencias

- Migración `20260728000005_create_initial_memberships_inasistencias.sql`
- Solo usuarios no ambiguos: `admin`, `inspectoria`, `inspector`, `staff`, `user`, `teacher`, `profesor_jefe`.
- `profesor_jefe` → `teacher` en Inasistencias.

### Paso 6: Backfill Convivencia

- Migración `20260728000006_create_initial_memberships_convivencia.sql`
- Solo usuarios no ambiguos: `admin`, `direccion`, `convivencia`, `inspectoria`, `inspector`, `staff`, `user`, `profesor_jefe`.

### Paso 7 (manual posterior): Revisión de ambiguos

- Usar `membership_readiness` para identificar casos.
- Insertar membresías faltantes manualmente.

---

## 8. Riesgos y mitigaciones

| Riesgo                                                                | Impacto                                          | Mitigación                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `carta_events.tenant_id` nullable → membership lookup falla para NULL | Membership no encontrada para eventos sin tenant | Migración futura para poblar NULLs; mientras tanto, el lookup simplemente retorna NULL |
| `absences`, `tests`, `instant_messages` sin `tenant_id`               | No se puede hacer RLS tenant-aware               | Estas tablas son legacy de Inasistencias; se tenantizarán en Fase 3                    |
| `coexistence_cases` sin `tenant_id`                                   | Tabla legacy sin aislamiento                     | Se tenantizará en Fase 3                                                               |
| 808 estudiantes en 1 tenant                                           | Carga de datos razonable para backfill           | Las inserciones son por lote, no por fila individual; el backfill es O(n)              |
| Dos apps compartiendo un trigger `on_auth_user_created`               | Duplicación de perfiles o conflictos             | Ya corregido en Fase 0.5b con `20260727000002_canonical_auth_trigger.sql`              |
| `profiles.role` se actualiza después de Fase 2                        | Desincronización con `app_memberships`           | Migración futura bloqueará escrituras a `profiles.role` o agregará trigger de sync     |
| Backfill inserta rol incorrecto para usuario ambiguo                  | Error de autorización                            | Los ambiguos no se insertan automáticamente — requieren revisión manual                |

---

## 9. Dependencias de fases futuras

### Fase 3: Tenantización de tablas legacy

- Agregar `tenant_id` a `absences`, `tests`, `instant_messages`, `coexistence_cases`.
- Poblar con el tenant del establecimiento correspondiente.
- Agregar RLS policies tenant-aware.

### Fase 4: Migración de RLS policies

- Reemplazar `current_app_role()` (lee `profiles.role`) por una nueva función que lea `app_memberships`.
- Ejemplo:
  ```sql
  CREATE OR REPLACE FUNCTION public.current_app_role(p_application_code TEXT)
  RETURNS TEXT
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT role FROM public.app_memberships
    WHERE user_id = auth.uid()
      AND application_code = p_application_code
      AND is_active = true
      AND tenant_id = public.current_tenant_id()
    LIMIT 1;
  $$;
  ```

### Fase 5: Deprecación de `profiles.role`

- Una vez que todas las RLS policies usen `app_memberships`:
  - Eliminar constraint CHECK de `profiles.role`.
  - Opcional: eliminar columna `profiles.role`.
  - Mantener `profiles.tenant_id` como Tenant of Record.

### Fase 6: Desacople de schemas (opcional)

- Separar Convivencia e Inasistencias en schemas PostgreSQL independientes (`convivencia.*`, `inasistencias.*`).
- Cada schema con sus propias tablas, RLS y función `current_app_role`.
- Schema `public` queda solo como puente de compatibilidad.
