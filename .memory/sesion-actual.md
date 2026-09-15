# Sesión actual

**Actualizado:** 2026-09-06

## En curso

- Piloto Gortex (v0.64.0): daemon + repo indexado (16.7k nodos) + MCP conectado. Medir savings 1 semana. Ojo: server github en 401, revisar PAT.

## Completado

- MCP: supabase autenticado (OAuth), server `git` roto eliminado, regla presupuesto MCP (máx. 10) en `opencode.json`.

## Notas para la próxima sesión

- `.agents/arquitectura.ts` e `implementacion.ts` ya no referencian `mcp-server-git` (paquete squatteado); git se usa por terminal.
