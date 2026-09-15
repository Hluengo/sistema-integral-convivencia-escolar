---
name: verificacion
description: Corre el loop de verificación completo (build, tipos, lint, tests+coverage, seguridad, diff) y reporta READY/NOT READY. Úsala tras un cambio significativo o antes de un PR.
---

# Skill: Verificación

> Reporte siempre en español. Si una fase falla, DETENTE y corrige antes de seguir.

## Fases (comandos de este repo)

1. **Tipos**: `npm run typecheck`
2. **Lint**: `npm run lint:code`
3. **Tests + cobertura**: `npm run test:coverage` (umbral: 80 % líneas)
4. **Seguridad**: `npm run security-audit` y `npm run security:secrets`
5. **Build web**: `npm run build:web`
6. **Diff**: `git diff --stat` — revisa archivos cambiados (sin secretos, sin `console.log` en `src/`)

Atajo: `npm run ci` cubre lint + test + build:web + security-audit.

## Reporte

```text
VERIFICACIÓN — Build: [PASS/FAIL] | Tipos: [PASS/FAIL] | Lint: [PASS/FAIL] |
Tests: [X/Y, Z% cobertura] | Seguridad: [PASS/FAIL] | Diff: [N archivos]
Estado: [READY/NOT READY]
Pendientes: 1. ... 2. ...
```
