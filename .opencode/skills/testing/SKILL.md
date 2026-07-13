---
name: testing
description: Escribe y ejecuta tests unitarios y E2E. Trigger: test, testing, cobertura, pruebas,unit, e2e.
---

# Testing Skill

Guía completa de testing para el proyecto.

## Framework

### Unit Tests
- Framework: `node:test` + `node:assert/strict`
- Runner: `tsx --test "src/**/*.test.ts"`
- Archivos: `*.test.ts` junto al archivo fuente

### E2E Tests
- Framework: Playwright
- Runner: `tsx --test "e2e/**/*.test.ts"`
- Requiere: `E2E_BASE_URL` env var

## Convenciones

### Archivos de Test
```
src/lib/causaFactory.ts → src/lib/causaFactory.test.ts
src/lib/dateUtils.ts → src/lib/dateUtils.test.ts
src/lib/api.ts → src/lib/api.test.ts
```

### Estructura de Test
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('NombreDelMódulo', () => {
  it('debería hacer X cuando Y', () => {
    // Arrange
    // Act
    // Assert
    assert.equal(result, expected);
  });
});
```

### Patrones
1. **AAA**: Arrange, Act, Assert
2. **Un test por caso de uso**
3. **Nombres descriptivos en español**
4. **Tests deterministas** (sin dependencias externas)
5. **Edge cases**: vacíos, nulos, límites

## Cobertura Actual
- `src/lib/api.test.ts` — 19 tests (API endpoints, auth)
- `src/lib/causaFactory.test.ts` — 3 tests (factory)
- `src/lib/dateUtils.test.ts` — 2 tests (fechas)
- `e2e/case-flow.test.ts` — 1 test (flujo completo)

## Ejecutar Tests
```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

## Comandos Relacionados
- `@tester` para escribir tests
- `@reviewer` para revisar cobertura
