# Regla: Seguridad API

## Uso
Aplicar a archivos en `api/` y `server.ts`.

## Reglas
1. SIEMPRE usar `requireAuth` en endpoints que modifiquen datos
2. SIEMPRE validar y sanitizar inputs
3. NUNCA exponer stack traces o errores internos al cliente
4. SIEMPRE usar prepared statements (Supabase maneja esto)
5. NO confiar en datos del cliente sin validación
6. SIEMPRE validar que el usuario tiene permisos para la operación

## Verificación
```bash
npm run lint  # Debe pasar sin errores
```
