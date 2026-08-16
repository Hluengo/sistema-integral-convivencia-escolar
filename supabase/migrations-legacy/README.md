# Migraciones históricas archivadas

Este directorio conserva las migraciones que precedían al checkpoint remoto de
`GestionConvivencia` (`mjhbcqwtjzgvqssfiore`). No se eliminan ni se editan.

El historial anterior no era reproducible desde cero: faltaba la migración base
que creaba `students` y `courses`, y `00002_anotaciones_tables.sql` referenciaba
`students.id` como `TEXT`, mientras el esquema canónico remoto usa `UUID`.

El flujo activo usa `supabase/migrations/00000_remote_schema_baseline.sql` como
checkpoint. Desde este punto, las nuevas migraciones deben agregarse únicamente
en `supabase/migrations/` con numeración posterior.

Antes de ejecutar `supabase db push` en un entorno compartido, hay que revisar y
aprobar una reparación de `supabase_migrations.schema_migrations` en Supabase.
Este cambio local no ejecuta esa reparación remota.
