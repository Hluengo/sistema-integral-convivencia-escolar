# Runbook: Índice histórico de estudiantes con actividad — 2026-08-15

**Estado:** Implementación local en curso; sin commit ni push
**Alcance:** estudiantes con al menos una causa o anotación
**Backup:** `backup/kpi-dashboard-inicial-20260815`

## Objetivo

Convertir la vista Estudiantes en un índice histórico resumido de convivencia escolar. No reemplaza ni duplica Causas o Anotaciones: concentra identidad, actividad agregada y acceso al detalle existente.

## Límites funcionales

- Incluir solo estudiantes con una causa o anotación asociada al tenant actual.
- Mostrar conteos de causas, causas activas, anotaciones totales y negativas.
- Mostrar la última actividad registrada.
- Mantener búsqueda, filtro por curso y agrupación.
- Derivar la gestión detallada a Causas y Anotaciones.
- No crear una segunda ficha disciplinaria ni nuevos estados.

## Fuente backend

La consulta agregada debe usar `students`, `causas` e `inspectorate_records`, filtrar por `current_tenant_id()` y excluir estudiantes sin actividad mediante `EXISTS`. La función debe ser invocable solo por `authenticated` y respetar RLS.

## Validación

- estudiante solo con causa;
- estudiante solo con anotación;
- estudiante con ambas fuentes;
- estudiante sin actividad no aparece;
- tenant distinto no aparece;
- causas activas y cerradas se cuentan por separado;
- última actividad se ordena correctamente;
- privacidad visual activa;
- búsqueda, curso y paginación siguen funcionando.

## Rollback

Separar cambios ajenos y volver al backup solo si se aprueba explícitamente:

    git status -sb
    git switch master
    git reset --hard backup/kpi-dashboard-inicial-20260815

No ejecutar `reset --hard` si existen cambios del usuario que deban conservarse.

## Criterio de cierre

La vista muestra únicamente estudiantes con actividad, entrega un resumen histórico útil y deja las acciones detalladas en Causas y Anotaciones.
