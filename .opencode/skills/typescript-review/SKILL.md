---
name: typescript-review
description: Revisa código TypeScript: tipos, patrones, performance, seguridad. Trigger: TypeScript, tipos, revisión, code review, calidad.
---

# TypeScript Review

Guía para revisar y mejorar código TypeScript.

## Checklist de Revisión

### 1. Tipos
- [ ] `any` evitado (usar `unknown` o tipos específicos)
- [ ] Interfaces para objetos públicos
- [ ] Enums para conjuntos finitos
- [ ] Generics para reutilización
- [ ] Utility types cuando aplique

### 2. Seguridad
- [ ] No hay secrets hardcodeados
- [ ] Input validation
- [ ] Sanitización de datos
- [ ] XSS prevention
- [ ] SQL injection prevention

### 3. Performance
- [ ] `useMemo` para cálculos costosos
- [ ] `useCallback` para funciones estables
- [ ] Lazy loading
- [ ] Code splitting
- [ ] Evitar re-renders innecesarios

### 4. Mantenibilidad
- [ ] Nombres descriptivos
- [ ] Funciones pequeñas (< 50 líneas)
- [ ] Single responsibility
- [ ] DRY (Don't Repeat Yourself)
- [ ] Comentarios útiles

### 5. Convenciones
- [ ] Consistencia en naming
- [ ] Imports ordenados
- [ ] Exports explícitos
- [ ] License headers

## Herramientas
- `tsc --noEmit` para type checking
- React Doctor para análisis
- VS Code para IntelliSense

## Comandos Relacionados
- `@reviewer` para code review
- `@typescript-review` para TypeScript
- `@developer` para implementación
