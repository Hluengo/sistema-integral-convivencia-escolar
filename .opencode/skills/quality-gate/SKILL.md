---
name: quality-gate
description: Ejecuta todas las validaciones del proyecto antes de declarar trabajo terminado
agent: qa-tester
---

# Quality Gate Skill

## Pasos obligatorios

Ejecutar en orden. Si alguno falla, detener y reportar.

1. `npm run typecheck` — errores de TypeScript
2. `npm run test` — tests unitarios
3. `npm run lint:code` — ESLint
4. `npm run build:web` — build de Vite
5. `npm run security-audit` — dependencias vulnerables
6. `git diff --check` — espacios en blanco problematicos

## Regla

No declarar trabajo terminado mientras exista algun fallo en estos pasos.
No omitir pasos aunque parezcan redundantes.
