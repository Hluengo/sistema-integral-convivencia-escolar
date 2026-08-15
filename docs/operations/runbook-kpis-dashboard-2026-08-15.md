# Runbook: Revisión integral de KPIs del dashboard — 2026-08-15

**Estado:** Backend y frontend implementados; pendiente revisión y aprobación para commit/push
**Rama base:** master
**Backup local:** backup/kpi-dashboard-inicial-20260815

## Objetivo

Convertir el dashboard en un panel de decisiones inmediatas: primero debe mostrar qué requiere atención ahora y después entregar contexto histórico o comparativo.

Se conservan el aislamiento por tenant, RLS, las cinco fases del debido proceso, Mediación como subflujo opcional, privacidad de NNA y compatibilidad con la aplicación de inasistencias.

## Línea base y rollback

Antes de editar:

    git status -sb
    git rev-parse HEAD
    git tag --list backup/kpi-dashboard-inicial-20260815

El tag local apunta al estado inicial de master. Para volver a él, solo después de separar cambios ajenos:

    git status -sb
    git switch master
    git reset --hard backup/kpi-dashboard-inicial-20260815

No borrar ni mover el tag durante la revisión. No ejecutar reset --hard si existen cambios del usuario que deban preservarse.

## Hallazgos que deben corregirse

| ID | Prioridad | Hallazgo | Criterio |
| --- | --- | --- | --- |
| KPI-01 | Crítica | “Alertas críticas” cuenta comprometeAulaSegura, no plazos próximos | Medir vencidos y próximos usando fechas y estado |
| KPI-02 | Crítica | La RPC pública fija critical_alerts en cero | Igualar la semántica pública y autenticada |
| KPI-03 | Alta | Hay métricas, pero no una cola de acciones | Cada alerta abre el expediente o estudiante correcto |
| KPI-04 | Alta | Rankings muestran volumen sin urgencia ni contexto | Mostrar período, último evento, umbral y acción |
| KPI-05 | Alta | El caché operativo puede durar cinco minutos | Alertas frescas y con fecha/hora de actualización |
| KPI-06 | Alta | La invalidación no incluye tendencias y todas las fuentes | Toda escritura relevante actualiza el dashboard |
| KPI-07 | Media | “Brecha” puede confundirse con atraso real | Separar backlog actual, flujo mensual y tasa de cierre |

## Contrato funcional

### Indicadores prioritarios

1. Expedientes vencidos.
2. Expedientes que vencen hoy.
3. Expedientes que vencen en 24/48/72 horas.
4. Anotaciones negativas pendientes de carta o derivación.
5. Estudiantes que cruzaron umbral sin actuación procesada.
6. Cartas pendientes de registro, notificación o seguimiento.
7. Expedientes en investigación sin actividad reciente.
8. Casos de alta gravedad sin actuación posterior.

### Indicadores secundarios

- causas activas y resueltas;
- distribución por gravedad y fase;
- tendencias mensuales;
- rankings de cursos, estudiantes y docentes.

Los rankings son contexto, no acusaciones ni prioridad automática. Deben incluir período y definición.

## Orden de implementación

### Fase A — Línea base

1. Confirmar árbol limpio.
2. Ejecutar lint, tests y build.
3. Crear o confirmar el tag de backup.
4. Registrar SHA y resultados.

### Fase B — Fuente de plazos

Crear una migración nueva, sin modificar migraciones antiguas, que use plazo_24h, plazo_investigacion, plazo_cierre, estado vigente y America/Santiago.

La RPC debe devolver como mínimo overdue_count, due_today_count, due_soon_count, critical_count, as_of y school_year, siempre tenant-scoped. Revisar SECURITY DEFINER, search_path, grants y RLS antes de consumirla.

### Fase C — Cola de acciones

Agregar arriba del dashboard una lista con tipo de acción, expediente o estudiante, curso, responsable, estado, plazo, tiempo restante, última acción y navegación al detalle.

Con privacyMode activo no debe mostrar nombres completos ni en texto ni en etiquetas accesibles.

### Fase D — Etapas y cartas

Verificar que total = pendientes + procesadas, que cero anotaciones no aparezca como pendiente por error, que todas las RPC usen el mismo año escolar y que “procesada” signifique actuación registrada.

### Fase E — Frescura

Separar caché operativa de caché histórica, mostrar “Actualizado a las HH:MM” e invalidar tras crear o editar anotaciones, confirmar PDF, registrar carta, cambiar estado, cerrar o reabrir expediente. Incluir tendencias y consultas de causas.

### Fase F — Orden visual

1. Acciones urgentes.
2. Pendientes operativos.
3. Estado general.
4. Gravedad y fases.
5. Tendencias.
6. Rankings.

No agregar tarjetas si una lista accionable resuelve mejor la decisión.

## Implementación local actual

- KPI autenticado de alertas: ahora cuenta expedientes activos vencidos o con 0–2 días restantes usando `getCausaDeadline`.
- Cola de acciones: muestra hasta cinco expedientes prioritarios, respeta `privacyMode` y abre el expediente desde el dashboard.
- Frescura: la invalidación incluye tendencias anuales y la consulta de causas además de los KPIs y rankings existentes.
- Prueba de regresión: `dashboardActions.test.ts` cubre orden de prioridad y exclusión de expedientes cerrados.

La fuente persistida quedó implementada en `causas` mediante la migración `20260815164916_persist_causa_deadlines.sql`. El RPC autenticado `get_dashboard_deadline_kpis` entrega los conteos tenant-scoped y el frontend usa sus datos con fallback local.

## Validación local

### Técnica

    npm run lint
    npm run test
    npm run build:web
    npm run check:bundle
    npm run security-audit
    git diff --check

### Datos controlados

Comprobar expediente vencido, vencimiento hoy, vencimiento futuro, sin plazo, cerrado, estudiantes con 4/5/10/15 anotaciones, carta procesada/no procesada, alta gravedad sin actuación, dos tenants aislados y roles dirección/convivencia/inspectoría/profesor.

### Visual y funcional

Revisar dashboard vacío, pocos datos, muchas acciones, móvil, escritorio, carga, error, datos desactualizados, privacidad y navegación desde cada acción al detalle correcto.

## Criterios para publicar

Solo subir si:

- el KPI de plazos representa fechas reales;
- no existe una alerta que sea solo un alias de Aula Segura;
- cada acción tiene navegación verificable;
- tenant, roles y privacidad están validados;
- la marca de actualización es visible;
- lint, tests, build, bundle y security audit pasan;
- la migración nueva fue revisada y aplicada solo después de aprobar localmente;
- el diff no contiene cambios ajenos;
- el backup local sigue disponible.

El usuario debe aprobar la vista local antes del commit y push.

## Rollback si no gusta

1. Detener el servidor local.
2. Guardar logs y capturas útiles.
3. Separar cambios ajenos.
4. Volver al tag de backup.
5. Confirmar que lint y build regresan al estado base.

Si ya se aplicó una migración, no modificarla ni borrarla: crear una migración correctiva y verificar RPC, grants, RLS y datos. Si ya hubo push, no reescribir master; promover el último deployment sano o publicar un commit correctivo.

## Cierre

El runbook termina cuando los indicadores tienen definición documentada, las acciones son navegables, los datos son frescos y tenant-scoped, la vista local fue aprobada y solo entonces se crea el commit y se publica en GitHub.
