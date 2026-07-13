# Regla: TypeScript

## Uso
Aplicar a todo código TypeScript.

## Reglas
1. SIEMPRE usar tipos explícitos en parámetros y returns
2. NUNCA usar `any` — preferir `unknown` o tipos específicos
3. SIEMPRE usar interfaces para objetos complejos
4. SIEMPRE usar union types para valores limitados
5. SIEMPRE usar discriminated unions para estados
6. NO usar `@ts-ignore` — corregir el error
7. SIEMPRE usar `readonly` para arrays/objetos inmutables

## Ejemplo
```typescript
// Correcto
function procesarCausa(causa: Causa): Resultado {
  return { exitoso: true, causa };
}

// Incorrecto
function procesarCausa(causa: any): any {
  return causa;
}
```
