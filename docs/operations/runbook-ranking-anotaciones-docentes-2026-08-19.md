# Runbook: corrección del ranking de anotaciones docentes — 2026-08-19

**Estado:** implementado y aplicado en Supabase; pendiente commit/push/deploy de la migración local

**Objetivo:** que el dashboard muestre la cantidad de anotaciones únicas del año escolar actual por docente, sin inflar el resultado por cargar varias veces PDFs acumulativos.

## Diagnóstico confirmado

La RPC anterior contaba directamente filas de `disciplinary_annotations_detected`, filtraba el año por `detected_at` y no eliminaba copias repetidas entre procesos.

En la revisión del tenant productivo se encontraron:

- 1.585 filas del año 2026.
- 1.344 negativas.
- 157 procesos para 115 estudiantes.
- 456 filas potencialmente repetidas en procesos distintos.
- 1.129 claves de anotación únicas usando estudiante, fecha, tipo, docente y texto.
- 948 negativas únicas frente a 1.344 filas negativas.

Los duplicados son una señal de PDFs acumulativos, pero no se eliminan automáticamente porque dos hechos reales podrían compartir fecha, tipo, docente y texto.

## Criterio implementado

La RPC `get_teacher_annotation_ranking()` ahora:

1. Filtra por `tenant_id = current_tenant_id()`.
2. Filtra el año usando `annotation_date`, no la fecha de carga del PDF.
3. Usa `confirmed_annotation_type` cuando existe; si no, usa `annotation_type`.
4. Deduplica por:
   - estudiante;
   - fecha real de la anotación;
   - tipo efectivo;
   - docente normalizado;
   - texto normalizado.
5. Conserva para el conteo la primera copia detectada, sin borrar filas.
6. Ordena por negativas únicas y limita el resultado al Top 5.
7. Mantiene `SECURITY DEFINER`, `search_path` explícito y ejecución solo para `authenticated` y `service_role`.

## Archivos

- Migración: `supabase/migrations/20260819123006_deduplicate_teacher_annotation_ranking.sql`
- Corrección de normalización: `supabase/migrations/20260819123222_normalize_teacher_annotation_types.sql`
- Consumo frontend: `src/shared/api/services/annotations.service.ts`
- Tarjeta: `src/features/anotaciones/TeacherAnnotationRanking.tsx`

No fue necesario cambiar el frontend: ya muestra los campos entregados por la RPC.

La primera migración se aplicó y luego se corrigió inmediatamente porque el dato remoto usa `negative/positive/information` en `confirmed_annotation_type`. La segunda migración normaliza esos valores a `Negativa/Positiva/Información`; ambas deben conservarse en el repositorio.

## Validación antes de aplicar

```powershell
npm run lint
npm run test
npm run build:web
git diff --check
```

Después de aplicar la migración, verificar:

```sql
select pg_get_functiondef('public.get_teacher_annotation_ranking()'::regprocedure);

select has_function_privilege(
  'anon',
  'public.get_teacher_annotation_ranking()',
  'execute'
) as anon_execute,
has_function_privilege(
  'authenticated',
  'public.get_teacher_annotation_ranking()',
  'execute'
) as authenticated_execute;
```

Resultado esperado: `anon_execute = false` y `authenticated_execute = true`.

La verificación funcional debe hacerse con una sesión autenticada del tenant y comparar el Top 5 devuelto con una consulta controlada que use el mismo criterio de deduplicación.

## Auditoría de posibles duplicados

La migración no borra datos. Para revisar candidatos antes de una eventual limpieza:

```sql
select
  student_id,
  annotation_date,
  annotation_type,
  teacher_name,
  coalesce(normalized_text, annotation_text, raw_text) as annotation_text,
  count(*) as copies,
  count(distinct process_id) as processes
from public.disciplinary_annotations_detected
where tenant_id = public.current_tenant_id()
group by student_id, annotation_date, annotation_type, teacher_name,
  coalesce(normalized_text, annotation_text, raw_text)
having count(*) > 1
order by copies desc;
```

No borrar ni consolidar filas sin revisar el PDF fuente y confirmar que son copias del mismo hecho.

## Rollback

Si el criterio produce un resultado incorrecto, crear una migración correctiva que restaure la función anterior. No borrar ni editar la migración ya aplicada. La reversión del dashboard es independiente de los datos fuente.

## Cierre operativo

La corrección se considera cerrada cuando:

- la migración aparece aplicada en el ledger remoto;
- la migración correctiva de tipos aparece aplicada después de la deduplicación;
- la función remota usa `annotation_date` y la deduplicación documentada;
- los grants son correctos;
- el ranking autenticado refleja conteos únicos;
- el frontend carga sin error;
- no se eliminaron datos automáticamente.
