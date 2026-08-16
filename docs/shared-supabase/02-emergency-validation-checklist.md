# Checklist de validación de la Fase 0 — Contención de acceso anónimo

## Validación local (antes de ejecutar remoto)

- [x] La migración `supabase/migrations/20260726000001_emergency_anon_data_containment.sql` existe.
- [x] La migración `supabase/migrations/20260726000002_security_definer_search_path_hardening.sql` existe.
- [x] La migración `supabase/migrations/20260726000003_revoke_anon_sensitive_rpc_execute.sql` existe (correctiva).
- [x] No contienen `DROP ... CASCADE`.
- [x] No borran datos (`DELETE`, `TRUNCATE`).
- [x] No modifican migraciones antiguas.
- [x] No incluyen secretos ni datos personales.
- [x] `current_tenant_id()` retorna `NULL` cuando `auth.uid()` es `NULL`.
- [x] `current_tenant_id()` no usa UUID default para anon.
- [x] `current_tenant_id()` no usa `raw_user_meta_data`.
- [x] `current_tenant_id()` tiene `GRANT EXECUTE` solo a `authenticated`.
- [x] `current_tenant_id()` es `SECURITY DEFINER` con `search_path = public`.
- [x] Se revocan `anon` y `PUBLIC` sobre todas las tablas escolares detectadas (24 tablas).
- [x] Se eliminan todas las policies public con `USING (true)` / `WITH CHECK (true)` detectadas en remoto.
- [x] Se elimina `p_courses_public_select`.
- [x] Storage buckets `documents`, `documentos_convivencia`, `anotaciones`, `disciplinary-processes` quedan `public=false`.
- [x] Se elimina `p_documents_public_read`.
- [x] Se elimina `p_docs_conv_public_read`.
- [x] El script `shared_supabase_preflight.sql` es solo READ-ONLY.
- [x] Funciones `SECURITY DEFINER` `clean_old_logs`, `count_affected_tests`, `process_audit_log`, `set_tenant_id` tienen `search_path = public, pg_temp`.

### RPCs (nota sobre 00001 → 00003)

- [x] `20260726000001` intentó revocar anon/PUBLIC de RPCs dentro de un bloque `DO` con comprobaciones `IF EXISTS`.
- [x] Las ACL directas de anon **no fueron revocadas** por el bloque `DO`. Los checks `pg_get_function_identity_arguments` coincidían pero el `REVOKE` no tuvo efecto.
- [x] `20260726000003` aplica `REVOKE EXECUTE` directo (sin bloque condicional) sobre las 6 firmas confirmadas en remoto.
- [x] `20260726000003` no revoca `authenticated`, `service_role` ni `postgres`.
- [x] `20260726000003` no elimina funciones ni overloads.

### SECURITY DEFINER hardening (00002 → 00004)

- [x] `20260726000002` corrigió `search_path = public, pg_temp` en las 4 funciones SECURITY DEFINER.
- [x] `20260726000002` aplicó `REVOKE ALL FROM PUBLIC` pero las ACL directas (`anon=X/postgres`, `authenticated=X/postgres`) permanecieron.
- [x] `20260726000004` aplica `REVOKE EXECUTE` directo sobre `anon`, `authenticated` y `PUBLIC` para las 4 funciones.
- [x] `20260726000004` no revoca `service_role` ni `postgres`.
- [x] `20260726000004` no elimina funciones ni modifica sus cuerpos.

## Validación remota (después de ejecutar la migración)

### Con `anon` key

- [x] `SELECT` sobre `courses` retorna 0 filas.
- [x] `SELECT` sobre `students` retorna 0 filas.
- [x] `SELECT` sobre `causas` retorna 0 filas.
- [x] `SELECT` sobre `audit_logs` retorna 0 filas.
- [x] `SELECT` sobre `document_analyses` retorna 0 filas.
- [x] `SELECT` sobre `disciplinary_processes` retorna 0 filas.
- [x] `SELECT` sobre `carta_events` retorna 0 filas.
- [x] `SELECT` sobre `profiles` retorna 0 filas.
- [x] `SELECT` sobre `absences` retorna 0 filas.
- [x] `SELECT` sobre `tests` retorna 0 filas.
- [x] `SELECT` sobre `instant_messages` retorna 0 filas.
- [x] `SELECT` sobre `coexistence_cases` retorna 0 filas.
- [x] `SELECT` sobre `feriados_chile` retorna 0 filas.
- [x] `get_student_annotation_summary()` no es ejecutable por `anon`.
- [x] `get_annotation_stage_counts()` no es ejecutable por `anon`.
- [x] `teacher_get_public_absences()` no es ejecutable por `anon`.
- [x] `teacher_get_public_absence_detail()` no es ejecutable por `anon`.
- [x] `teacher_get_instant_messages()` no es ejecutable por `anon`.
- [x] `current_tenant_id()` no retorna el UUID default para `anon`.

### Con usuario autenticado válido

- [x] La aplicación Convivencia puede iniciar sesión.
- [x] La aplicación Convivencia puede leer `courses`, `students`, `causas` en su tenant.
- [x] La aplicación Inasistencias puede iniciar sesión.
- [x] La aplicación Inasistencias puede leer `courses`, `students`, `absences`, `tests` con sus roles actuales.
- [x] Los flujos autenticados de Convivencia funcionan sin errores RLS inesperados.
- [x] Los flujos autenticados de Inasistencias que invocan `teacher_get_*` pueden recibir `300 Multiple Choices` (overloads no resueltos en Fase 0). No es bloqueante si el frontend usa ruta explícita.
- [x] No aparecen errores de RLS inesperados en funcionalidades administrativas.

### Storage

- [x] Buckets `documents`, `documentos_convivencia`, `anotaciones`, `disciplinary-processes` son privados.
- [x] No se puede leer un objeto sin autenticación en ninguno de esos buckets.
- [x] `pg_policies` no contiene `p_documents_public_read`.
- [x] `pg_policies` no contiene `p_docs_conv_public_read`.

### Funciones y políticas

- [x] `current_tenant_id()` tiene `SECURITY DEFINER` y `search_path = public`.
- [x] `pg_policies` no contiene `p_courses_public_select`.
- [x] `pg_policies` no contiene policies public con `USING (true)` / `WITH CHECK (true)` en tablas escolares.
- [x] `has_table_privilege('anon', ..., 'SELECT')` es `false` para tablas escolares.
- [x] `has_function_privilege('anon', 'public.current_tenant_id()', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.get_student_annotation_summary()', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.get_annotation_stage_counts()', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.teacher_get_public_absences(...)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.teacher_get_public_absence_detail(...)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.teacher_get_instant_messages(...)', 'EXECUTE')` es `false`.
- [x] `clean_old_logs`, `count_affected_tests`, `process_audit_log`, `set_tenant_id` tienen `search_path` seguro (`public, pg_temp`).

### Validación específica de 20260726000003

- [x] `has_function_privilege('anon', 'public.get_student_annotation_summary()', 'EXECUTE')` es `false` (corregido por 00003).
- [x] `has_function_privilege('anon', 'public.get_annotation_stage_counts()', 'EXECUTE')` es `false` (corregido por 00003).
- [x] `has_function_privilege('anon', 'public.teacher_get_instant_messages(text, uuid, uuid)', 'EXECUTE')` es `false` (corregido por 00003).
- [x] `has_function_privilege('anon', 'public.teacher_get_public_absence_detail(uuid)', 'EXECUTE')` es `false` (corregido por 00003).
- [x] `has_function_privilege('anon', 'public.teacher_get_public_absences(integer, integer, text)', 'EXECUTE')` es `false` (corregido por 00003).
- [x] `has_function_privilege('anon', 'public.teacher_get_public_absences(integer, integer, text, uuid)', 'EXECUTE')` es `false` (corregido por 00003).

### Validación específica de 20260726000004

- [x] `has_function_privilege('anon', 'public.clean_old_logs(integer)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.count_affected_tests(uuid,date,date)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.process_audit_log()', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('anon', 'public.set_tenant_id(uuid)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('authenticated', 'public.clean_old_logs(integer)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('authenticated', 'public.count_affected_tests(uuid,date,date)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('authenticated', 'public.process_audit_log()', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('authenticated', 'public.set_tenant_id(uuid)', 'EXECUTE')` es `false`.
- [x] `has_function_privilege('service_role', 'public.clean_old_logs(integer)', 'EXECUTE')` es `true` (conservado).
- [x] `has_function_privilege('postgres', 'public.clean_old_logs(integer)', 'EXECUTE')` es `true` (conservado).

## Registro de resultados

| Fecha      | Validador             | Resultado         | Incidencias                                                        |
| ---------- | --------------------- | ----------------- | ------------------------------------------------------------------ |
| 2026-07-25 | Revisión automatizada | ✅ Fase 0 cerrada | 00003 y 00004 correctivas necesarias por ACL directas no revocadas |

## Notas

- ✅ **Fase 0 cerrada.** Todas las validaciones locales y remotas completadas exitosamente.
- La Vista Docente sin login permanece temporalmente deshabilitada (se restaurará con tokens seguros).
- Si alguna validación adicional falla, no hacer rollback destructivo.
- Crear una migración forward-fix y aplicarla.
- Actualizar esta checklist con el resultado de cada validación.

## Restricciones

- No copiar en este documento nombres de estudiantes, RUT, correos, observaciones, nombres de archivos ni contenido de documentos.
- Registrar solo estructura, resultados de conteos y estados de acceso.

---

## Fase 0.5b — Validación (agregada post-aplicación)

- [x] `profiles.tenant_id` nullable ✅
- [x] `profiles.role` nullable ✅
- [x] `handle_new_user()` inserta solo `(user_id, email)` sin `raw_user_meta_data` ✅
- [x] Solo 1 trigger activo en `auth.users` (on_auth_user_created → handle_new_user) ✅
- [x] `handle_new_user_profile` eliminado (trigger duplicado removido) ✅
- [x] 7 tablas con DEFAULT `current_tenant_id()` ✅
- [x] Bucket `documents` public=false con 5 policies tenant-aware + 1 legacy ✅
- [x] 149 objetos en documents (148 absences/* + 1 root) legibles via legacy policy con `is_staff()` ✅
- [x] `useAuth` expone `tenantId` desde `profiles.tenant_id` ✅
- [x] `inspectorateService` requiere `tenant_id` explícito ✅
- [x] Signed URLs: preview 600s, download 3600s ✅
- [x] Vista Docente en modo mantenimiento con 5 estados RPC ✅

---

## Fase 1 — Reconciliación canónica (cerrada)

### Inventario remoto

- [x] 25 tablas/vistas inventariadas con columnas, tipos, RLS, policies, row counts
- [x] 28 funciones inventariadas con firma, grants, search_path, SECURITY DEFINER
- [x] 4 buckets storage con policies, MIME, counts, path patterns
- [x] 76 índices documentados
- [x] 98 policies analizadas (84 public + 14 storage)

### Documentación creada

- [x] Adoption ledger (04-canonical-object-ledger.md) — 60+ objetos clasificados
- [x] Migration reconciliation (05-migration-reconciliation.md) — cronología, deriva, política forward-only
- [x] Canonical baseline (06-canonical-baseline-20260727.md) — estado completo post-Fase 0.5b
- [x] Code consumption matrix (07-code-consumption-matrix.md) — ~58 referencias mapeadas
- [x] Phase 2 membership design (08-phase-2-membership-design.md) — arquitectura applications/app_memberships

### Migraciones reconciliadas

- [x] 46 migraciones locales (34 Convivencia + 12 Inasistencias) analizadas
- [x] 9 aplicaciones manuales (4 Fase 0 + 5 Fase 0.5b) documentadas con orden real
- [x] Deriva documentada: solo 3/55 migraciones registradas en remoto
- [x] Política forward-only establecida

### Validación local

- [x] Convivencia: lint correcto ✅
- [x] Convivencia: 136 tests correctos ✅
- [x] Convivencia: build:web correcto ✅
- [x] Inasistencias: lint correcto ✅
- [x] Inasistencias: 120 tests correctos ✅
- [x] Inasistencias: build correcto ✅

### Restricciones

- [x] No se modificó Supabase
- [x] No se ejecutó SQL de escritura
- [x] No se aplicaron migraciones nuevas
- [x] No se reejecutaron migraciones antiguas
- [x] No se usó db push / db reset / migration up
- [x] No se hizo deploy / commit / push
- [x] No se abrió data.sql
