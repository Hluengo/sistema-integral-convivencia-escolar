# Instrucciones para ejecutar el preflight remoto

## Archivo

`supabase/diagnostics/shared_supabase_preflight.sql`

## Propósito

Este script es **READ-ONLY**. No modifica datos, funciones, políticas ni grants.

Permite inspeccionar el estado real del proyecto Supabase compartido para preparar el Plan v5 y validar la Fase 0 de contención.

## Cómo ejecutar

1. Abrir **Supabase SQL Editor** del proyecto remoto.
2. Iniciar sesión como usuario con permisos de lectura sobre `information_schema`, `pg_catalog`, `public`, `storage` y `auth`.
3. Crear una **New query**.
4. Copiar y pegar todo el contenido de `shared_supabase_preflight.sql`.
5. Ejecutar.
6. Exportar los resultados (preferiblemente como CSV o JSON) y entregarlos al equipo para continuar con el Plan v5.

## Qué inspecciona

1. **Migrations**: `supabase_migrations.schema_migrations`
2. **Definición de `current_tenant_id()`**: `pg_get_functiondef()`
3. **Firmas exactas de funciones clave**: `current_tenant_id`, `current_app_role`, `current_role`, `is_staff`, `is_superuser`, `teacher_get_public_absences`, `teacher_get_public_absence_detail`, `teacher_get_instant_messages`, `get_student_annotation_summary`, `get_annotation_stage_counts`
4. **Funciones SECURITY DEFINER**: owner, firma, `search_path`, privilegios `EXECUTE`
5. **Políticas RLS**: `pg_policies` para todas las tablas escolares y `storage.objects`
6. **Grants efectivos**: `information_schema.table_privileges` y `column_privileges` para `anon`, `authenticated` y `PUBLIC`; también `has_table_privilege` y `has_function_privilege` para validación exacta
7. **Triggers sobre `auth.users`**: `pg_trigger`
8. **Buckets**: `storage.buckets` (público/privado, límite, MIME types)
9. **Objetos**: conteos agregados por bucket y verificación de prefijos tenantizados
10. **Definición de tablas**: columnas, nullability, defaults, PKs, FKs, UNIQUE, CHECK, índices, estado RLS
11. **Conteos agregados**: registros por tabla, sin `tenant_id`, etc.
12. **Perfiles por rol**: solo conteos
13. **Consistencia de tenants**: cruces de `student`/`course` entre tenants
14. **Comportamiento de `current_tenant_id()` para anon**: retorna `NULL`, UUID default u otro valor

## Consultas complementarias para validar Fase 0

Si ya se aplicó `20260726000001_emergency_anon_data_containment.sql` y `20260726000002_security_definer_search_path_hardening.sql`, ejecutar:

```sql
-- 1. current_tenant_id() para anon debe retornar NULL
SELECT auth.uid() AS uid, public.current_tenant_id() AS tenant;

-- 2. Anon no puede ejecutar funciones sensibles
SELECT has_function_privilege('anon', 'public.get_student_annotation_summary()', 'EXECUTE');
SELECT has_function_privilege('anon', 'public.get_annotation_stage_counts()', 'EXECUTE');
SELECT has_function_privilege('anon', 'public.teacher_get_public_absences(int,int,text)', 'EXECUTE');
SELECT has_function_privilege('anon', 'public.teacher_get_public_absence_detail(uuid)', 'EXECUTE');
SELECT has_function_privilege('anon', 'public.teacher_get_instant_messages(text,uuid,uuid)', 'EXECUTE');

-- 3. Anon no tiene privilegios sobre tablas escolares
SELECT has_table_privilege('anon', 'public.students', 'SELECT');
SELECT has_table_privilege('anon', 'public.courses', 'SELECT');
SELECT has_table_privilege('anon', 'public.audit_logs', 'SELECT');
SELECT has_table_privilege('anon', 'public.profiles', 'SELECT');

-- 4. Buckets privados
SELECT id, public FROM storage.buckets WHERE id IN ('documents','documentos_convivencia','anotaciones','disciplinary-processes');

-- 5. No deben existir policies public abiertas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text ILIKE '%public%'
  AND (qual = 'true' OR with_check = 'true');

-- 6. SECURITY DEFINER functions con search_path seguro
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       COALESCE(array_to_string(array(SELECT s FROM unnest(p.proconfig) AS s WHERE s LIKE 'search_path=%'), ', '), 'NOT SET') AS search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true;
```

## Qué NO incluye

- Nombres de estudiantes.
- RUT.
- Correos.
- Observaciones.
- Nombres de archivos.
- Contenido de documentos.

## Restricciones

- No ejecutar en producción sin supervisión.
- No modificar el script para incluir consultas que expongan datos personales.
- Si el entorno no permite acceso a `pg_catalog`, algunas secciones pueden requerir `service_role` o acceso directo a PostgreSQL.

## Siguiente paso

Entregar los resultados al equipo de arquitectura para:

- confirmar el estado real del remoto;
- detectar funciones/policies que no existen en las migraciones locales;
- validar la corrección de la Fase 0 si se aplicó;
- construir el Plan v5 basado en evidencia remota.
