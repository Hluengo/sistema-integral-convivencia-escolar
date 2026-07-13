# Regla: React Hooks

## Uso
Aplicar a todo código React.

## Reglas
1. SIEMPRE usar `useCallback` para funciones pasadas como props
2. SIEMPRE usar `useMemo` para cálculos costosos
3. SIEMPRE usar `useEffect` con dependencias correctas
4. SIEMPRE manejar estados de carga y error
5. NO mutar state directamente — usar spread operator
6. SIEMPRE usar keys únicas en listas
7. NO usar `any` — preferir tipos específicos

## Ejemplo
```typescript
// Correcto
const filtered = useMemo(() => 
  items.filter(i => i.status === status), 
  [items, status]
);

// Incorrecto
const filtered = items.filter(i => i.status === status); // Recálcula en cada render
```
