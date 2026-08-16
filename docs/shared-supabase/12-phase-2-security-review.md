# Revisión de Seguridad — Fase 2 (Post-Reconciliación)

**Fecha:** 2026-07-28
**Estado:** Reconciliada — 9 migraciones aplicadas, todas verificadas en remoto.
**SHA-256 sellados en el documento.**

---

## 1. Resumen de migraciones reconciliadas

| #   | Nombre remoto                              | Versión remota   | SHA-256 local | Estado                   |
| --- | ------------------------------------------ | ---------------- | ------------- | ------------------------ |
| 1   | `create_applications`                      | `20260726160213` | `7F401886...` | ✅ Aplicada              |
| 2   | `revoke_applications_default_privileges`   | `20260726160356` | `08DD9309...` | ✅ Aplicada (correctiva) |
| 3   | `create_app_memberships`                   | `20260726160630` | `6EB928B2...` | ✅ Aplicada              |
| 4   | `seed_applications`                        | `20260726160831` | `168A1E3A...` | ✅ Aplicada              |
| 5   | `prepare_membership_backfill`              | `20260726160936` | `00B1193C...` | ✅ Aplicada              |
| 6   | `enable_membership_tables_and_tenants_rls` | `20260726161102` | `2F49E1FC...` | ✅ Aplicada              |
| 7   | `create_membership_helpers`                | `20260726161246` | `2FE0E634...` | ✅ Aplicada              |
| 8   | `create_initial_memberships_inasistencias` | `20260726161400` | `423DE0EE...` | ✅ Aplicada              |
| 9   | `create_initial_memberships_convivencia`   | `20260726161504` | `A636D976...` | ✅ Aplicada              |

> **Nota:** El orden local (00001–00009) difiere del orden real de aplicación en remoto. La migración correctiva `revoke_applications_default_privileges` fue aplicada como segunda en remoto, inmediatamente después de `create_applications`.

---

## 2. Migración correctiva 00009

**Nombre remoto:** `revoke_applications_default_privileges`
**Fecha real de aplicación:** 2026-07-26 (durante sesión de Fase 2)
**Motivo:** Supabase aplica privilegios heredados por defecto a las tablas. La migración 00001 definía GRANT explícitos pero los privilegios heredados persistían. 00009 revoca todo y restaura el ACL least-privilege aprobado.

### Verificación post-aplicación

```sql
-- ACL de applications
postgres=arwdDxtm/postgres, authenticated=r/postgres, service_role=arwd/postgres

-- has_table_privilege:
-- anon: NO SELECT, NO INSERT, NO UPDATE, NO DELETE
-- authenticated: SELECT only
-- service_role: SELECT, INSERT, UPDATE, DELETE
-- postgres: ALL
```

**Resultado:** ✅ Least-privilege verificado. Anon sin acceso. Authenticated solo puede leer.

---

## 3. Validación remota completa

### RLS

| Tabla             | RLS Activo | Policy SELECT                                                    | Policy INSERT/UPDATE/DELETE |
| ----------------- | ---------- | ---------------------------------------------------------------- | --------------------------- |
| `applications`    | ✅         | `applications_select_authenticated` — `USING (is_active = true)` | Solo `service_role`         |
| `app_memberships` | ✅         | `app_memberships_select_own` — `USING (user_id = auth.uid())`    | Solo `service_role`         |
| `tenants`         | ✅         | `tenants_select_own` — `USING (id = current_tenant_id())`        | Solo `service_role`         |

**Conclusión:** ✅ Ningún authenticated tiene INSERT/UPDATE/DELETE en ninguna de las tres tablas.

### Helpers

| Función                      | SECURITY DEFINER | search_path       | EXECUTE anon | Owner    |
| ---------------------------- | ---------------- | ----------------- | ------------ | -------- |
| `current_user_memberships()` | ✅               | `public, pg_temp` | ❌           | postgres |
| `has_app_access()`           | ✅               | `public, pg_temp` | ❌           | postgres |

**EXECUTE grantees:** authenticated, service_role, postgres

### Backfill

| Aplicación    | Rol     | Cantidad |
| ------------- | ------- | -------- |
| inasistencias | teacher | 1        |

- Sin duplicados ✅
- Sin huérfanos ✅
- Staff excluido ⚠️

---

## 4. Correcciones realizadas

| Migración | Corrección                                                                                  | Gravedad       |
| --------- | ------------------------------------------------------------------------------------------- | -------------- |
| **00001** | Eliminada policy `applications_admin_all` que permitía INSERT/UPDATE/DELETE a authenticated | **Bloqueador** |
| **00004** | Corregido typo `membership_readINESS` → `membership_readiness`                              | Cosmético      |
| **00007** | Eliminadas 3 policies de escritura en `tenants`                                             | **Bloqueador** |
| **00007** | Eliminada recreación de `applications_admin_all`                                            | **Bloqueador** |
| **00009** | Revocación de privilegios heredados en applications                                         | **Seguridad**  |

---

## 5. Feature flag

| Repositorio   | Valor                                |
| ------------- | ------------------------------------ |
| Convivencia   | `VITE_APP_MEMBERSHIPS_ENABLED=false` |
| Inasistencias | `VITE_APP_MEMBERSHIPS_ENABLED=false` |

Con flag `false`:

- No se consultan tablas `app_memberships` / `applications` en frontend
- `profiles.role` sigue como fallback de autorización
- Membership ausente NO bloquea login
- Vista Docente sigue en mantenimiento

---

## 6. Validación local

### Convivencia

| Comando             | Resultado             |
| ------------------- | --------------------- |
| `npm run lint`      | ✅ 0 errors           |
| `npm test`          | ✅ 136/136 tests pass |
| `npm run build:web` | ✅ build exitoso      |

### Inasistencias

| Comando            | Resultado                            |
| ------------------ | ------------------------------------ |
| `npm test`         | ✅ 120/120 tests pass                |
| `npm run build`    | ✅ build exitoso                     |
| `npx tsc --noEmit` | ✅ sin errores de tipos              |
| `npm run lint`     | ⚠️ 2155 preexisting (CRLF, prettier) |

---

## Decisión final

**FASE 2 RECONCILIADA — SEGURIDAD VERIFICADA**

- ✅ 9 migraciones aplicadas y reconciliadas con remoto
- ✅ ACL least-privilege verificado con `has_table_privilege`
- ✅ RLS policies correctas sin USING(true) genérico en escritura
- ✅ Helpers SECURITY DEFINER con search_path seguro
- ✅ Backfill: 1 membership, sin duplicados, staff excluido
- ✅ Feature flag `false` en ambos repos
- ✅ 136/136 + 120/120 tests pasando
- ✅ Build exitoso en ambos repos

**APTOS PARA INICIAR FASE 3**
