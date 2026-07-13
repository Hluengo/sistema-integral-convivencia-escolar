# Regla: Supabase

## Uso
Aplicar a código que interactúe con Supabase.

## Reglas
1. SIEMPRE usar el cliente Supabase singleton
2. SIEMPRE verificar autenticación antes de operaciones protegidas
3. SIEMPRE usar RLS policies — no bypass
4. SIEMPRE usar tipos generados de Supabase
5. SIEMPRE manejar errores de Supabase específicamente
6. NO hardcodear IDs de tablas — usar constantes
7. SIEMPRE usar transacciones para operaciones múltiples

## Environment Variables
```
SUPABASE_URL=https://jjzwwhnofiepvliugowr.supabase.co
SUPABASE_ANON_KEY=... (legacy)
SUPABASE_SECRET_KEY=... (ES256)
```
