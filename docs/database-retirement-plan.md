# Database Retirement Plan

Fecha: 2026-07-23

Este documento es solo de diagnostico y retiro gradual. No contiene instrucciones de eliminacion inmediata en produccion.

## Reglas

- No ejecutar `DROP`, `TRUNCATE`, `DELETE` masivo ni `supabase db push` desde esta auditoria.
- No retirar tablas, columnas, triggers, politicas, buckets ni funciones sin evidencia productiva.
- Toda baja debe pasar por deprecacion, observacion, migracion de datos y aprobacion.

## Tablas que requieren verificacion productiva

### absences

- Referencias locales: requiere verificacion adicional fuera del codigo frontend principal.
- FK/triggers/RLS: verificar en Supabase Dashboard y migraciones aplicadas.
- Posible uso externo: asistencia, reportes o integraciones administrativas.
- Riesgo: alto si alimenta reportes historicos.
- Recomendacion: clasificar como `REQUIRES_PRODUCTION_USAGE_CHECK`.

### coexistence_cases

- Referencias locales: posible flujo legado frente a `causas` y proceso disciplinario nuevo.
- FK/triggers/RLS: verificar dependencias SQL y vistas.
- Posible uso externo: reportes historicos de convivencia.
- Riesgo: alto por trazabilidad y debido proceso.
- Recomendacion: mantener, marcar candidata Nivel B solo tras estadisticas de uso.

### instant_messages

- Referencias locales: no confirmadas como flujo activo en esta limpieza.
- FK/triggers/RLS: verificar si hay realtime, cron o Edge Functions.
- Posible uso externo: mensajeria o notificaciones futuras.
- Riesgo: medio.
- Recomendacion: conservar hasta revisar eventos y uso productivo.

### tests

- Referencias locales: nombre generico; posible tabla de pruebas o datos semilla.
- FK/triggers/RLS: verificar directamente en esquema remoto.
- Posible uso externo: QA, demo o migraciones antiguas.
- Riesgo: bajo a medio, pero no eliminar sin confirmar ambiente.
- Recomendacion: si no tiene datos productivos, deprecar primero.

### audit_logs

- Referencias locales: auditoria transversal.
- FK/triggers/RLS: revisar triggers y funciones de auditoria.
- Posible uso externo: seguridad, cumplimiento y trazabilidad.
- Riesgo: critico.
- Recomendacion: conservar.

### feriados_chile

- Referencias locales: calculo de dias habiles legales puede depender de calendario.
- FK/triggers/RLS: probablemente sin FK, pero usada por logica legal o SQL.
- Posible uso externo: plazos administrativos y cumplimiento normativo.
- Riesgo: medio/alto por plazos disciplinarios.
- Recomendacion: conservar hasta verificar calculadores SQL y frontend.

## Politicas duplicadas o superpuestas

Pendiente de revisar con estadisticas y esquema remoto. No se simplificaron politicas RLS en esta ejecucion.

## Triggers activos

Pendiente de inventario remoto. No se modificaron triggers.

## Buckets antiguos

Pendiente de diagnostico solo lectura cruzando Storage con tablas de documentos/procesos. No se eliminaron archivos.

## Indices a revisar

- `establishment_id`, `student_id`, `process_id`, `created_at`, `status` en tablas disciplinarias.
- FKs sin indice explicito.
- Indices posiblemente redundantes requieren `pg_stat_user_indexes` antes de retiro.

## SQL de diagnostico solo lectura

```sql
select schemaname, relname, indexrelname, idx_scan
from pg_stat_user_indexes
order by idx_scan asc;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select trigger_schema, event_object_table, trigger_name
from information_schema.triggers
order by event_object_table, trigger_name;
```

## Procedimiento de retiro recomendado

1. Marcar objeto como deprecated en documentacion interna.
2. Detener nuevas escrituras si existe reemplazo funcional.
3. Observar uso productivo y logs por al menos un ciclo operacional.
4. Migrar datos necesarios a la estructura canonica.
5. Retirar lecturas y dependencias.
6. Preparar migracion destructiva separada, reversible en respaldo, solo con aprobacion.
