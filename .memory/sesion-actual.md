# Sesión actual

**Actualizado:** 2026-10-23

## En curso — 22–23-10-2026

- Ejecutando `docs/operations/runbook-correcciones-auditoria-integral-2026-10-22.md`: **NOT READY**, evidencia RED/GREEN y pendientes por A01–A13 en §9. No darlo por terminado.
- Cambios locales sobre `aeb0156e`: borradores v2 privados/validados, renovación auth sin perder contexto, confirmación durable y cola lenta, HTML íntegro, etiquetas de cartas y fecha del incidente; Vite 8.2.4.
- Segundo lote: PDF con texto aún abierto y navegación anterior; tres migraciones A01/A04/A08 solo en `runbook_audit_20261022_v3`. RLS, rollback, idempotencia, huso horario y carreras reales aprobados con `npm run test:db:runbook`.
- Decisión del usuario: expedientes por membresía activa de Convivencia + perfil activo del mismo colegio (ADR-0009). A07 pendiente, sin bloquear IA ni prometer anonimización completa.
- Docker/Supabase local operativos. `postgres` original conserva `20260808100000`, sin incidentes; esquema idéntico a la copia previa. Sin reset ni copia de datos personales.
- Tercer bloque A10: historial/bitácora y evidencia adicional con borrador privado; cierre conserva y descarte explícito. Fecha/texto ya no se ignoran; confirmaciones pendientes sobreviven recarga y la respuesta antigua no borra una edición solo en memoria con cuota agotada. Detalle/límites en §9.8.
- Verificación vigente: Node 22.23.4, 1.050/1.050 (221 suites), 91,84 % reportado; 24/24 navegador y cuatro escenarios nuevos repetidos tras formato. Lint/build/Knip/presupuesto JS (2.216.011 bytes) y auditoría productiva (0) aprobados. SQL/carreras aprobados en el lote anterior, no repetidos sin cambios DB.
- Pendientes: A10 hitos/avances, constancia física, fundamentos, plantillas y administración; E2E específico de evidencia adicional e integración autenticada del nuevo bloque; limpieza terminal de cartas/notificaciones/incidente. A01 requiere coordinación con Inasistencias; staging/UI autenticada, correo y promoción/CI remoto sin validar.
- Sin commit/push/deploy, correos ni escrituras/migraciones remotas. `opencode.json` preexistente intacto; `api/index.js` regenerado. Sin refresco por foco/reconexión. Evidencia y siguientes tareas en §9.5–§9.8 del runbook.

## Antecedentes — 03-10-2026

- Auditoría integral comiteada (`76f935a8` + `946b881f`): 33 archivos borrados, 3 deps quitadas, a11y Sidebar y `fetchCausasPage` resueltos. Skips decididos: DashboardStats (WIP ajeno) y `auditarExpediente` (riesgo legal > valor cosmético).
- Árbol limpio 2026-10-03: ruido de bundle `api/index.js` revertido (se regenera con `npm run build`). Queda `DESIGN.md` sin trackear (doc de diseño, 27-09) pendiente de decisión.
- Bug hito grupal (Emilia/Facundo, 03-10, sin comitear): CSP zod (`main.tsx` importa schemas primero), `persistExistingCausa` ya no descarta bitácora/checklist si falla el núcleo, y el detalle no pisa edición local con guardado pendiente (`resolveDetailCausa` + `hasUnsavedCausaChanges`). Suite 891/891.
- Supabase verificado 03-10 (sondas solo-lectura): hitos compartidos con flag, checklist `chk_seg_1` done e incidentes correctos en segundos medios (14), 8BB y 1MA. Nada que reparar en la base; el desfase era vistas desactualizadas (caché 60s/5min + autoguardado 2s). No se hizo ninguna escritura.
- Refresco automático 03-10 (sin comitear): `refetchOnWindowFocus: true` en `queryClient` — con varias pestañas/sesiones la tabla y los hermanos se actualizan al volver a la pestaña. Suite 891/891. PENDIENTE usuario: recarga forzada + reinicio de `npm run dev` (su pestaña corre bundle viejo: el error CSP zod persiste).
- Prueba decisiva 03-10: reconciliación + fase con filas reales de 019/025 dan Seguimiento por vía detalle y lista. Código y base correctos; la vista del usuario no ejecuta este código (sin listener en 5173/5174 ahora; worktrees viejos en Temp). Paso cero: una sola instancia de dev en esta carpeta + Ctrl+Shift+R; el error CSP debe desaparecer como prueba de bundle nuevo.
- CAUSA RAÍZ REAL 03-10 (e2e): PostgREST trunca a 1000 filas; el lote del listado (51 causas × ~30 ítems) llegaba mutilado (Emilia traía 4/30 filas) y las fases salían mal. Fix: `chunkIds` + tramos ≤20 en `hydrateChecklistSummaries` e hitos (`causas.service.ts`), con tests. E2E readonly en build fresco: Emilia en Seguimiento + hito compartido visible + 0 errores CSP. Suite 893/893.
- Hito colectivo automático 03-10 (sin comitear): el label compartido ("Medida o Plan…"/"Causa Cerrada") no existe en el checklist base, así que se heredaba en bitácora pero nunca completaba el checklist de los hermanos (por eso había que ir uno por uno). Fix: alias en `LEGACY_LABEL_ALIASES` (`checklistReconciliation.ts`) + tests. E2E readonly en build fresco: 017 sin hito propio figura en Seguimiento por herencia. Suite 895/895.

## Completado

- Cláusula de reconsideración eliminada del docgen (docTypes/CompromisoContent/tests) con guard anti-regresión en `tests/auditoria-final.spec.ts`.
- Piloto Gortex en curso (v0.64.0, 16.7k nodos).
- MCP: supabase autenticado (OAuth), server `git` roto eliminado, regla presupuesto MCP (máx. 10) en `opencode.json`.

## Guardado para enero 2027 (actualización grande)

- Último runbook ejecutado: `docs/operations/runbook-mejora-auditoria-integral-2026-09-26.md` — cerrado el 2026-09-27 en el commit `cf6171df`, ya versionado en git (no se pierde). Guardado como línea base para la actualización de enero.
- Cubre: enlace `target="_blank"`, cobertura de pruebas, logs de consola, CORS/redirección fija y superficie de excepciones; su criterio es no refactorizar por métricas sin evidencia.
- Después de esa fecha hubo trabajo sin runbook propio (bug de hitos grupales y truncamiento PostgREST, 2026-10-03); la evidencia de eso vive en `causas.service.ts`, `checklistReconciliation.ts` y esta memoria.

## Notas para la próxima sesión

- `.agents/arquitectura.ts` e `implementacion.ts` ya no referencian `mcp-server-git`; git se usa por terminal.
- Knip quedó en 0 unused files/0 deps; quedan ~30 unused exports (barrels de schemas y API surface de services) por depurar si se quiere.
- `docs/arquitectura-runtime.html` (849KB) excluido del watcher de opencode; sigue contaminando métricas de Gortex.
