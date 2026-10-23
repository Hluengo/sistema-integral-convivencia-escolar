# ADR-0009: autorización de expedientes por membresía de Convivencia

**Fecha:** 2026-10-22. **Decisión:** aprobada por el usuario durante el runbook de octubre. Implementación local; no aplicada remotamente.

## Contexto

La UI combinaba perfil y membresía con OR; RLS leía el perfil. Un perfil administrativo podía sobrepasar una membresía docente y superadmin no completaba todas las escrituras del alta.

## Decisión

- La membresía activa de `convivencia` autoriza el expediente. Además exige aplicación activa y perfil activo del mismo colegio.
- Crear/editar: `superadmin`, `admin`, `direccion`, `convivencia`, `inspectoria`, `inspector`, `staff`.
- Eliminar registros del expediente y reabrir: `superadmin`, `admin`, `direccion`.
- Docentes, profesores jefes y `user`: solo lectura en su colegio. Sin membresía válida no hay acceso a expedientes.
- Superadmin no obtiene acceso a expedientes de otros colegios por su rol.
- `current_convivencia_role()` es específico de esta app. No se cambia `current_app_role()` ni `current_tenant_id()`, compartidos con Inasistencias.

## Consecuencias

Una cuenta con roles diferentes usa su membresía de Convivencia, no el perfil más privilegiado. Las pruebas SQL usan perfiles docentes con membresías operativas para comprobarlo y cubren accesos revocados/inactivos.

La migración de perfiles A01 sigue siendo compartida y requiere coordinación con Inasistencias antes de aplicación remota. A07 permanece pendiente por decisión del usuario; este ADR no autoriza publicación.
