# Sesión actual

**Actualizado:** 2026-10-03

## En curso

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

## Notas para la próxima sesión

- `.agents/arquitectura.ts` e `implementacion.ts` ya no referencian `mcp-server-git`; git se usa por terminal.
- Knip quedó en 0 unused files/0 deps; quedan ~30 unused exports (barrels de schemas y API surface de services) por depurar si se quiere.
- `docs/arquitectura-runtime.html` (849KB) excluido del watcher de opencode; sigue contaminando métricas de Gortex.
