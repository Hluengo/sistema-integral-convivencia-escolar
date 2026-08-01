# Reconciliación del historial de Supabase

Fecha de revisión: 2026-08-01
Proyecto: `mjhbcqwtjzgvqssfiore` (`GestionConvivencia`)

## Estado observado

- Migraciones históricas locales: 59 (conservadas en `supabase/migrations-legacy/`).
- Versiones registradas remotamente: 12.
- Versiones con archivo local identificable: 7 (`00000` y seis migraciones históricas).
- Versiones remotas sin archivo local: 5.
- Migraciones nuevas de agosto aplicadas manualmente pero aún no registradas: 3.
- Las tablas de auditoría, membresías, notificaciones e historial de reportes existen remotamente.
- Las tablas institucionales, el bucket privado `institution-assets` y la publicación
  Realtime de `notifications` también fueron verificados remotamente el 2026-08-01.

## Versiones registradas remotamente

```text
00000
20260727175043
20260727181206
20260728185201
20260728202937
20260729191822
20260729215646
20260729215812
20260729215837
20260731003251
20260731003405
20260731191230
```

`00000` corresponde al baseline remoto actual. Las versiones
`20260727181206`, `20260729191822`, `20260729215646`, `20260729215812`,
`20260729215837` y `20260731191230` tienen archivos históricos identificables
en el repositorio.

## Versiones remotas sin archivo local

```text
20260727175043
20260728185201
20260728202937
20260731003251
20260731003405
```

Estas versiones no deben recrearse ni reemplazarse con archivos inventados: probablemente corresponden a cambios aplicados desde otro checkout, una rama anterior o una migración consolidada.

## Versiones locales nuevas aún no registradas

Las siguientes migraciones tienen efectos verificados parcialmente en remoto,
pero no aparecen en el ledger entregado:

```text
20260801090000_scope_document_templates_by_tenant.sql
20260801100000_add_institutional_configuration.sql
20260801120000_enable_notifications_realtime.sql
```

Antes de registrarlas se debe ejecutar
`supabase/operations/migration-ledger-new-migrations-check.sql`. Solo si todas
las precondiciones devuelven `true` se podrá solicitar una reparación explícita
de esas tres versiones. La reparación registra estado; no vuelve a ejecutar DDL.

La validación fue completada el 2026-08-01 y todas las precondiciones
resultaron `true`. El registro controlado está preparado en
`supabase/operations/register-verified-migrations.sql`. Ese script solo agrega
las tres versiones verificadas y deja intactas las cinco versiones remotas sin
archivo local.

## Corrección local aplicada

El historial anterior no podía inicializar el shadow DB: faltaba la base que
creaba `students` y `courses`, y `00002_anotaciones_tables.sql` usaba `TEXT`
para una FK cuyo tipo canónico remoto es `UUID`.

Se creó `supabase/migrations/00000_remote_schema_baseline.sql` a partir de un
dump estructural del esquema público remoto, sin filas de datos. Las 59
migraciones históricas fueron conservadas sin editar en
`supabase/migrations-legacy/`. Las nuevas migraciones deben agregarse solo en
`supabase/migrations/` con una versión posterior al baseline.

## Regla de seguridad

No ejecutar:

```text
supabase db push
supabase migration repair --status applied <todas-las-migraciones-locales>
```

La primera puede intentar aplicar DDL que ya existe. La segunda falsearía el historial si alguna migración local no está realmente reflejada en producción.

## Estado de resolución

1. El CLI sigue recibiendo HTTP 403 en `Initialising login role`; queda como limitación de acceso, no como bloqueo de reconciliación.
2. El ledger remoto fue leído en SQL Editor y contiene 12 versiones.
3. Las tres migraciones nuevas fueron validadas por sus objetos y registradas de forma controlada:
   `20260801090000`, `20260801100000` y `20260801120000`.
4. Las cinco versiones remotas sin archivo local se conservan como historial externo y no se recrean.
5. Las futuras migraciones deben seguir siendo forward-only y aplicarse de forma controlada.

## Resultado de la comparación del baseline

El `supabase db diff --linked` ya logra crear el shadow database y aplicar el
baseline. El resultado restante contiene únicamente diferencias de entorno:

- `DROP EXTENSION pg_net`.
- `REVOKE` de privilegios globales sobre las tablas nuevas para `anon` y
  `authenticated`.

No se debe ejecutar ese diff como migración: `pg_net` es una extensión gestionada
por el entorno de Supabase y esas líneas no representan un cambio funcional de la
aplicación. La reconciliación del esquema de tablas quedó desbloqueada.

## Estado del superadministrador

La cuenta `superadmin@colegio.cl` y su membresía ya están activas remotamente. La migración local `20260801010000_activate_superadmin_convivencia_membership.sql` queda como documentación reproducible, pero no debe ejecutarse mediante `db push` hasta cerrar la reconciliación.
