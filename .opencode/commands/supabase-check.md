Revisa conexion Supabase, tablas relevantes, errores y RLS sin modificar datos.

Pasos:

1. Verificar conexion a Supabase
2. Listar tablas principales (causas, profiles, anotaciones, etc.)
3. Revisar RLS policies de tablas con datos sensibles
4. Revisar buckets de Storage y sus politicas
5. Revisar logs de errores recientes
6. Reportar hallazgos sin modificar nada

Solo lectura. No ejecutar UPDATE, DELETE, ALTER, DROP ni cambios de RLS.
