# Regla: Testing

## Uso
Aplicar a todo código de testing.

## Reglas
1. SIEMPRE usar `node:test` + `node:assert/strict` para tests unitarios
2. SIEMPRE usar Playwright para tests E2E
3. SIEMPRE ser determinista — no depender de estado externo
4. SIEMPRE cubrir happy path y error paths
5. SIEMPRE usar `beforeEach` para setup limpio
6. NO testear implementación — testear comportamiento
7. SIEMPRE usar factories para datos de test

## Ejemplo
```typescript
// Correcto
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('CausaService', () => {
  beforeEach(() => {
    // Setup limpio
  });

  it('debería crear causa con datos válidos', () => {
    const causa = crearCausa({ ... });
    assert.ok(causa.id);
  });
});
```
