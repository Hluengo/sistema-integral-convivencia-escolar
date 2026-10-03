# Sesión actual

**Actualizado:** 2026-10-03

## En curso

- Auditoría integral modo agresivo (ponytail-audit) implementada: 33 archivos borrados (-5099 líneas), 3 deps quitadas (`@opencode-ai/plugin`, `ws`, `fflate`), lint a11y Sidebar arreglado, `fetchCausasPage` partido en 2 helpers. Pendiente solo commit (esperando confirmación) y skips decididos: DashboardStats (WIP ajeno) y `auditarExpediente` (riesgo legal > valor cosmético).

## Completado

- Cláusula de reconsideración eliminada del docgen (docTypes/CompromisoContent/tests) con guard anti-regresión en `tests/auditoria-final.spec.ts`.
- Piloto Gortex en curso (v0.64.0, 16.7k nodos).
- MCP: supabase autenticado (OAuth), server `git` roto eliminado, regla presupuesto MCP (máx. 10) en `opencode.json`.

## Notas para la próxima sesión

- `.agents/arquitectura.ts` e `implementacion.ts` ya no referencian `mcp-server-git`; git se usa por terminal.
- Knip quedó en 0 unused files/0 deps; quedan ~30 unused exports (barrels de schemas y API surface de services) por depurar si se quiere.
- `docs/arquitectura-runtime.html` (849KB) excluido del watcher de opencode; sigue contaminando métricas de Gortex.
