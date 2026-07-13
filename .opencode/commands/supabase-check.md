# Comando: supabase-check

## Descripción
Verifica el estado de la base de datos Supabase.

## Uso
Cuando haya problemas de conexión o se necesite verificar schema.

## Flujo
1. Verificar variables de entorno de Supabase
2. Probar conexión con cliente Supabase
3. Verificar tablas existentes
4. Verificar RLS policies
5. Verificar storage buckets
6. Reportar estado

## Salida
- Estado de conexión
- Lista de tablas y su estado
- Errores encontrados
- Recomendaciones
