# Regla: Privacidad de Datos

## Uso
Aplicar a todo el código que maneje información personal de estudiantes.

## Reglas
1. NUNCA loggear RUTs, nombres completos o datos sensibles
2. SIEMPRE usar pseudonimización en logs de IA
3. NUNCA exponer datos de estudiantes en errores al cliente
4. SIEMPRE respetar RGPD/LOPD en manejo de datos
5. NO compartir datos entre estudiantes sin autorización
6. SIEMPRE anonimizar datos en analytics/reportes

## Ejemplo
```typescript
// Correcto
console.log(`Causa ${causaId} procesada`);

// Incorrecto
console.log(`Causa de ${estudiante.nombre} ${estudiante.rut} procesada`);
```
