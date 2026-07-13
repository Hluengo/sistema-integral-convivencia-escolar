# Regla: Almacenamiento Seguro

## Uso
Aplicar a código que maneje uploads y archivos en Supabase Storage.

## Reglas
1. SIEMPRE validar tipos MIME y tamaños de archivo
2. SIEMPRE usar nombres únicos (UUID) para archivos
3. SIEMPRE generar URLs firmadas con expiración
4. NUNCA exponer URLs firmadas en logs o errores
5. SIEMPRE verificar permisos antes de upload/download
6. NO permitir path traversal en nombres de archivo

## Bucket Policy
- Solo usuarios autenticados pueden subir
- Lectura pública con URLs firmadas
- Eliminación solo con autenticación
