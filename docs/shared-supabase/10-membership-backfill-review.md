# Backfill Review — Phase 2 Membership Auto-assignment

> **Status:** Revisión completada  
> **Fecha:** 2026-07-26  
> **Remoto consultado:** Sí — datos reales verificados

---

## Resumen de perfiles remotos

| Total | Con tenant | Sin tenant | Con rol | Sin rol |
| ----- | ---------- | ---------- | ------- | ------- |
| 2     | 2          | 0          | 2       | 0       |

## Clasificación de backfill

| Categoría                                   | Perfiles | Acción                                              |
| ------------------------------------------- | -------- | --------------------------------------------------- |
| `teacher` → `inasistencias`                 | 1        | ✅ Automático en migración 00005                    |
| `direccion` / `convivencia` → `convivencia` | 0        | ✅ Automático en migración 00006 (ninguno presente) |
| `staff` — ambiguo                           | 1        | ❌ Excluido. Revisión manual requerida              |
| `admin` — ambiguo                           | 0        | ❌ Excluido. Requiere determinar consumo real       |
| `profesor_jefe` — ambiguo                   | 0        | ❌ Excluido                                         |
| `inspectoria` — ambiguo                     | 0        | ❌ Excluido                                         |
| `inspector` — ambiguo                       | 0        | ❌ Excluido                                         |
| `user` — ambiguo                            | 0        | ❌ Excluido                                         |
| `superuser` — ambiguo                       | 0        | ❌ Excluido                                         |
| Sin tenant / sin rol                        | 0        | ❌ Excluido                                         |

## Perfiles ambiguos

### staff (1 perfil)

| Campo     | Valor          |
| --------- | -------------- |
| user_id   | (no expuesto)  |
| tenant_id | default tenant |
| role      | `staff`        |

**Decisión:** Este perfil no se puede asignar automáticamente porque `staff` es un rol transversal que podría pertenecer a Convivencia, Inasistencias o ambas. Se requiere revisión manual para determinar:

1. ¿Este usuario consume Convivencia?
2. ¿Este usuario consume Inasistencias?
3. ¿O ambos?

### Procedimiento manual

```sql
-- 1. Consultar perfil ambiguo (service_role)
SELECT * FROM public.membership_readiness WHERE membership_category = 'ambiguous';

-- 2. Insertar membresías manuales según decisión:
INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
VALUES ('<tenant_id>', '<user_id>', 'convivencia', 'staff');

INSERT INTO public.app_memberships (tenant_id, user_id, application_code, role)
VALUES ('<tenant_id>', '<user_id>', 'inasistencias', 'staff');
```

## Criterio de clasificación

Ver `08-phase-2-membership-design.md` para la matriz completa de transición.

| Rol             | ¿Automático? | Convivencia       | Inasistencias     |
| --------------- | ------------ | ----------------- | ----------------- |
| `teacher`       | ✅           | —                 | `teacher`         |
| `direccion`     | ✅           | `direccion`       | —                 |
| `convivencia`   | ✅           | `convivencia`     | —                 |
| `admin`         | ❌           | Requiere revisión | Requiere revisión |
| `profesor_jefe` | ❌           | Requiere revisión | Requiere revisión |
| `inspectoria`   | ❌           | Requiere revisión | Requiere revisión |
| `inspector`     | ❌           | Requiere revisión | Requiere revisión |
| `staff`         | ❌           | Requiere revisión | Requiere revisión |
| `user`          | ❌           | Requiere revisión | Requiere revisión |
| `superuser`     | ❌           | Requiere revisión | Requiere revisión |
