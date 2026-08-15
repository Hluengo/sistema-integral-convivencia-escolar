# Runbook: Aislamiento tenant del selector de cursos — 2026-08-15

**Estado:** Implementado localmente y aplicado en Supabase; sin commit ni push
**Alcance:** Consulta de cursos usada por filtros y formularios autenticados
**Incidente:** Dos registros con nombre `7° Básico B` pertenecían a tenants distintos y el selector mostraba ambos.

## Objetivo

Evitar que una persona usuaria vea o seleccione cursos de otro establecimiento y asegurar que el filtro de estudiantes use el `course_id` del tenant actual.

## Corrección

- La política `p_courses_staff_select` exige `tenant_id = current_tenant_id()`.
- `fetchCourses` aplica además el filtro explícito del tenant actual.
- La caché mantiene la clave por tenant existente en `useCoursesQuery`.

## Validación

- El tenant principal conserva su `7° Básico B` y sus estudiantes.
- El curso homónimo del otro tenant no aparece en el selector.
- El filtro 7B muestra estudiantes y causas abiertas del tenant actual.
- Se verifica que no haya errores de consola ni overlay de Vite.
- Ejecutar `npm run lint`, `npm run test`, `npm run build:web` y E2E.

## Rollback

Revertir la migración `20260815210633` solo con una nueva migración compensatoria. El cambio de frontend puede revertirse separadamente; no restaurar políticas cross-tenant sin una revisión de seguridad.

## Criterio de cierre

Cada tenant ve únicamente sus cursos y el filtro de estudiantes 7B funciona con el identificador correcto.
