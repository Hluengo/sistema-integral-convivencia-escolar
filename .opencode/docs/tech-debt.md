# Tech Debt — Debido Proceso

## Estado Actual
- **Lint**: PASA ✅
- **Tests**: 19/19 pasan ✅
- **Archivos src/**: 69
- **TODOs/FIXMEs**: Ninguno

## Deuda Técnica Identificada

### 1. Dual Server Entry Points
- **Problema**: `api/index.js` (CommonJS) y `server.ts` (ESM) duplican endpoints
- **Impacto**: Mantenimiento doble, riesgo de inconsistencias
- **Solución**: Unificar en un solo archivo o usar code sharing
- **Prioridad**: Media

### 2. AI Prompts Hardcoded
- **Problema**: Prompts de AI están parcialmente hardcoded en hooks
- **Impacto**: Difícil de mantener y actualizar
- **Solución**: Mover todo a `document_templates` (parcialmente hecho)
- **Prioridad**: Baja

### 3. Tests Limitados
- **Problema**: Solo tests de API, no hay tests de componentes React
- **Impacto**: Regresiones no detectadas en UI
- **Solución**: Agregar React Testing Library
- **Prioridad**: Media

### 4. Sin CI/CD
- **Problema**: No hay pipeline automatizado
- **Impacto**: Deploy manual, riesgo de errores
- **Solución**: GitHub Actions
- **Prioridad**: Alta

### 5. Sin Docker
- **Problema**: No hay containerización
- **Impacto**: Dificultad para desarrollo local consistente
- **Solución**: Dockerfile + docker-compose
- **Prioridad**: Baja

### 6. E2E Tests Pendientes
- **Problema**: Playwright configurado pero sin tests
- **Impacto**: No hay tests end-to-end
- **Solución**: Crear tests E2E para flujos críticos
- **Prioridad**: Media

## Próximos Pasos Recomendados
1. **CI/CD**: Configurar GitHub Actions para lint + test + build
2. **Tests React**: Agregar React Testing Library
3. **E2E**: Crear tests para flujo de caso completo
4. **Refactor**: Unificar server entry points
