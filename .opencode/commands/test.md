---
description: Genera y ejecuta tests para el código especificado
agent: test
---

Genera tests para: $ARGUMENTS

Usa las siguientes herramientas:
- **Unit tests**: `node:test` + `node:assert/strict` (archivos en `src/**/*.test.ts`)
- **E2E tests**: Playwright (archivos en `e2e/**/*.test.ts`)

Pasos:
1. Identifica qué tested components o functions necesitan tests
2. Genera tests cubriendo: happy path, edge cases, error handling
3. Ejecuta `npm run test` para unit tests
4. Si aplica, ejecuta `npm run test:e2e` para E2E
5. Reporta cobertura y tests que fallan
