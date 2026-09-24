# Runbook OpenCode: expediente digital y debido proceso

## 1. Objetivo

Implementar en `Hluengo/sistema-integral-convivencia-escolar` un expediente digital autosuficiente. Al abrir una causa, la aplicación debe mostrar paso a paso qué se hizo, cuándo, quién intervino, qué documentos respaldan cada actuación, qué garantías están pendientes y cuál es el próximo paso.

La aplicación debe organizar y exportar antecedentes para Gemini Notebook. No debe redactar automáticamente:

- Informe de Cierre.
- Informe Concluyente.
- Resolución de reconsideración o apelación.

Estos documentos podrán incorporarse posteriormente como archivos externos elaborados y validados.

## 2. Repositorio y restricciones

- Repositorio: `Hluengo/sistema-integral-convivencia-escolar`.
- Rama base: `master`.
- Frontend: React + TypeScript.
- Persistencia: Supabase.
- Mantener RLS, aislamiento por `tenant_id`, auditoría y trazabilidad.
- No utilizar datos reales durante desarrollo o pruebas.
- No eliminar ni reinterpretar IDs históricos de checklist.
- No alterar documentos históricos ni completar datos inexistentes.
- Toda corrección debe conservar el registro anterior.
- Usar lenguaje de convivencia escolar: `proceso de indagación`, `antecedentes`, `descargos`, `hechos acreditados`, `reconsideración` y `diálogo restaurativo`.

## 3. Resultado esperado

Cada causa debe permitir consultar:

1. Resumen del expediente.
2. Ruta del debido proceso.
3. Historial cronológico unificado.
4. Documentos y evidencias.
5. Matriz hecho–evidencia–descargo–RICE.
6. Estado jurídico-procedimental.
7. Seguimiento.
8. Exportación completa para Gemini Notebook.

La relación funcional será:

`Causa → fase → hito → actuación → documento → hecho → responsable → fecha → resultado → historial`.

## 4. Diagnóstico obligatorio antes de editar

Revisar completamente:

- `AGENTS.md`
- `src/shared/lib/types.ts`
- `src/shared/lib/data.ts`
- `src/shared/lib/schemas/index.ts`
- `src/shared/lib/domain/investigationChecklist.ts`
- `src/shared/lib/auditoria.ts`
- `src/shared/lib/semaforo.ts`
- `src/features/timeline/`
- `src/features/causas/expediente/`
- `src/features/causas/matriz/`
- `src/shared/api/services/causas.service.ts`
- `src/shared/api/services/checklistProgress.service.ts`
- `src/shared/api/services/storage.service.ts`
- migraciones vigentes de `supabase/migrations/`

Antes de modificar, ejecutar las pruebas existentes y registrar el resultado base.

## 5. Hallazgos críticos que deben corregirse

### 5.1 Incompatibilidad de tipos de bitácora

`BitacoraEntry` permite `Citación`, `Correo` y `Descargo`, pero `BitacoraEntrySchema` no los admite. Corregir el esquema para que frontend, validación y base de datos usen la misma enumeración.

Valor esperado:

```ts
z.enum([
  "Entrevista",
  "Evidencia",
  "Notificación",
  "Citación",
  "Correo",
  "Descargo",
  "Mediación",
  "Resolución",
  "Otro",
]);
```

Agregar pruebas que carguen y mantengan cada tipo después de guardar y volver a abrir una causa.

### 5.2 Exportación incompleta

El expediente exportado actualmente usa principalmente checklist y bitácora. Incorporar también:

- `checklist_progress_entries`.
- Hechos.
- Vínculos hecho–evidencia.
- Documentos de causa.
- Medidas de resguardo.
- Antecedentes RICE.
- Agravantes y atenuantes.
- Reconsideraciones.
- Seguimiento.

### 5.3 Fuentes fragmentadas

La información se encuentra repartida entre varias tablas. Crear una capa de lectura agregada del expediente sin eliminar las tablas actuales.

## 6. Estrategia de implementación

Trabajar en fases pequeñas. Cada fase debe compilar, pasar pruebas y poder revertirse independientemente.

### Fase 0. Línea base y protección

1. Crear rama de trabajo: `feature/expediente-debido-proceso`.
2. Ejecutar lint, typecheck, pruebas unitarias y pruebas de flujo.
3. Documentar fallos preexistentes sin corregir asuntos ajenos.
4. Confirmar políticas RLS de las tablas afectadas.
5. No desplegar producción hasta completar pruebas integrales.

### Fase 1. Correcciones de integridad

1. Unificar enum de tipos de bitácora.
2. Corregir esquemas Zod.
3. Verificar mapeos Supabase ↔ TypeScript.
4. Agregar pruebas de persistencia de citaciones, correos y descargos.
5. Comprobar que ninguna entrada válida sea descartada silenciosamente.

Criterio de aceptación: guardar, recargar y visualizar todos los tipos de actuación sin pérdida.

### Fase 2. Versión del modelo procedimental

Agregar a la causa:

```ts
proceduralModelVersion?: 1 | 2;
```

- Casos históricos: versión 1.
- Casos nuevos: versión 2.
- No migrar automáticamente hitos inexistentes.
- Mantener lectura compatible con ambas versiones.

Crear migración Supabase idempotente, constraints y mapeos de servicio.

### Fase 3. Hitos reforzados

Mantener las cinco fases internas para compatibilidad. Mostrar `Indagación` en la interfaz aunque internamente se conserve temporalmente `Investigación`.

#### Recepción

- `chk_rec_1`: Recepción y registro del antecedente.
- `chk_rec_2`: Evaluación inicial y medidas de resguardo.
- `chk_rec_3`: Apertura y comunicación del proceso.

#### Indagación

- `chk_inv_1`: Inicio del proceso de indagación.
- `chk_inv_2`: Recopilación y contraste de antecedentes.
- `chk_inv_7`: Comunicación de antecedentes.
- `chk_inv_8`: Descargos recibidos o plazo vencido.
- `chk_inv_9`: Cierre formal de la indagación.

#### Subflujo restaurativo opcional

- `chk_inv_3`: Evaluación de viabilidad restaurativa.
- `chk_inv_4`: Diálogo restaurativo en desarrollo.
- `chk_inv_5`: Diálogo finalizado con acuerdo.
- `chk_inv_6`: Diálogo no realizado o finalizado sin acuerdo.

No contar el subflujo restaurativo dentro del total obligatorio. Exigir voluntariedad, seguridad y ausencia de asimetría impeditiva.

#### Análisis y decisión

- `chk_res_2`: Informe de cierre de indagación incorporado, solo si el usuario lo adjunta.
- `chk_res_7`: Hechos y participación individual analizados.
- `chk_res_8`: RICE, historial y proporcionalidad analizados.
- `chk_res_9`: Decisión fundada incorporada.
- `chk_res_6`: Decisión formalmente notificada.

La aplicación no redacta los documentos. Registra su incorporación, revisión y notificación.

#### Reconsideración o apelación

- `chk_imp_2`: Solicitud recibida.
- `chk_imp_4`: Solicitud resuelta.
- `chk_imp_6`: Plazo vencido sin presentación.
- `chk_imp_7`: Decisión definitiva notificada.

`chk_imp_2` y `chk_imp_6` son excluyentes.

#### Seguimiento

- `chk_seg_1`: Medidas y acompañamiento iniciados.
- `chk_seg_2`: Seguimiento en desarrollo.
- `chk_seg_3`: Seguimiento finalizado.
- `chk_seg_4`: Proceso formalmente cerrado.

No reutilizar IDs históricos con otro significado. Conservarlos para expedientes versión 1.

### Fase 4. Modelo enriquecido del hito

Extender checklist y persistencia con:

```ts
type MilestoneApplicability = "pendiente" | "aplica" | "no_aplica";
type MilestoneStatus =
  | "no_iniciado"
  | "en_desarrollo"
  | "cumplido"
  | "vencido"
  | "no_aplica"
  | "invalidado";

interface ChecklistItem {
  // campos actuales
  obligatorio?: boolean;
  aplicabilidad?: MilestoneApplicability;
  estado?: MilestoneStatus;
  fundamentoNoAplica?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  resultado?: string;
  bloqueanteParaAvanzar?: boolean;
  bloqueanteParaCerrar?: boolean;
}
```

Mantener campos opcionales para no romper casos históricos. Actualizar tipos, schemas, mapeos, migraciones y pruebas.

### Fase 5. Registro unificado de actuaciones

Crear tabla `expediente_events` como historial inmutable. No reemplazar inicialmente la bitácora: usarla como capa unificadora.

Campos mínimos:

```sql
id uuid primary key,
tenant_id uuid not null,
causa_id text not null,
incidente_id uuid null,
occurred_at timestamptz not null,
recorded_at timestamptz not null default now(),
recorded_by uuid null,
event_type text not null,
title text not null,
description text not null,
milestone_id text null,
hecho_id uuid null,
source_table text null,
source_id text null,
participants jsonb not null default '[]',
status text not null default 'vigente',
previous_event_id uuid null,
correction_reason text null,
metadata jsonb not null default '{}'
```

Requisitos:

- RLS por tenant.
- Índices por causa, fecha, hito y tipo.
- No permitir borrado físico desde el cliente.
- Rectificar mediante nuevo evento.
- Invalidar conservando el original.
- Registrar valor anterior, valor nuevo, usuario y motivo.

Generar eventos para apertura, cambios de estado, hitos, avances, entrevistas, notificaciones, citaciones, correos, descargos, evidencias, diálogo restaurativo, incorporación de informes externos, reconsideración, seguimiento, rectificación, invalidación, exportación y cierre.

### Fase 6. Centro único de documentos

Crear un índice documental normalizado, reutilizando Storage. No duplicar físicamente archivos.

Cada documento debe conservar:

- Causa e incidente.
- Nombre original y visible.
- Tipo MIME y tamaño.
- Ruta Storage.
- Hito relacionado.
- Actuación relacionada.
- Hecho relacionado.
- Fecha del documento e incorporación.
- Usuario que lo incorporó.
- Origen.
- Ámbito individual o grupal.
- Versión.
- Vigencia, invalidación y motivo.
- Hash SHA-256 cuando sea viable.

Permitir varios archivos por actuación. Todo archivo debe vincularse al menos a un hito, actuación o hecho.

No borrar archivos reemplazados: marcarlos como no vigentes y conservar su trazabilidad.

### Fase 7. Servicio agregado del expediente

Crear un servicio, por ejemplo:

`src/shared/api/services/expediente.service.ts`

Debe cargar por causa:

```ts
interface ExpedienteCompleto {
  causa: Causa;
  hitos: ChecklistItem[];
  actuaciones: ExpedienteEvent[];
  avances: ChecklistProgressEntry[];
  hechos: HechoRow[];
  vinculosHechoEvidencia: HechoEvidenciaRow[];
  documentos: ExpedienteDocument[];
  reconsideraciones: ReconsideracionRecord[];
  seguimientos: SeguimientoRecord[];
}
```

Consultar en paralelo, respetar tenant y deduplicar registros grupales. Las actuaciones compartidas deben mostrar su causa de origen y no confundirse con una actuación individual.

### Fase 8. Historial cronológico unificado

Crear una vista que integre todos los eventos en orden ascendente o descendente.

Cada tarjeta debe mostrar:

- Fecha y hora del hecho.
- Fecha y hora de registro, si difieren.
- Tipo.
- Título.
- Descripción.
- Responsable.
- Participantes.
- Fase e hito.
- Hecho relacionado.
- Documentos.
- Estado: vigente, rectificado o invalidado.
- Origen individual o grupal.

Agregar búsqueda y filtros por tipo, fecha, participante, responsable, hito, hecho y documento.

Los registros invalidados deben permanecer visibles con estilo diferenciado y motivo.

### Fase 9. Ruta guiada del debido proceso

Actualizar la ruta para mostrar:

- Estado del hito.
- Responsable.
- Fecha inicial y límite.
- Fecha de cumplimiento.
- Resultado.
- Documentos.
- Avances.
- Garantía resguardada.
- Motivo de bloqueo.
- Próxima actuación.

Centralizar reglas en:

`src/shared/lib/domain/proceduralTransitions.ts`

Implementar:

```ts
canCloseInvestigation(...)
canStartDecisionAnalysis(...)
canNotifyDecision(...)
canStartMeasures(...)
canCloseCase(...)
getNextRequiredAction(...)
```

Usar las mismas reglas en UI, auditoría, cierre, exportación y API. No confiar solo en botones deshabilitados.

### Fase 10. Auditoría reforzada

Actualizar `src/shared/lib/auditoria.ts`.

Bloqueantes para cerrar:

- Apertura notificada.
- Derecho a ser oído.
- Descargos recibidos o plazo vencido.
- Todos los hechos con conclusión.
- Evidencia vinculada para hechos acreditados.
- Norma RICE para hechos acreditados.
- Participación individual determinada.
- Agravantes, atenuantes e historial revisados.
- Proporcionalidad registrada.
- Decisión fundada incorporada.
- Decisión notificada.
- Reconsideración resuelta o plazo vencido.
- Documentos obligatorios disponibles.

No considerar una resolución verificada por cualquier `chk_res_*`. Verificar específicamente la decisión incorporada y su notificación.

La hoja de vida solo puede influir en proporcionalidad, nunca acreditar el hecho actual.

### Fase 11. Exportación para Gemini Notebook

La exportación debe contener antecedentes, no documentos generados automáticamente.

Estructura ZIP:

```text
00_INDICE_DEL_EXPEDIENTE/
01_CARATULA_Y_DATOS_GENERALES/
02_CRONOLOGIA_COMPLETA/
03_RUTA_DEL_DEBIDO_PROCESO/
04_HECHOS_Y_EVIDENCIAS/
05_ENTREVISTAS_Y_DECLARACIONES/
06_DESCARGOS/
07_NOTIFICACIONES_Y_CITACIONES/
08_CORREOS_Y_COMUNICACIONES/
09_ANTECEDENTES_RICE/
10_HISTORIAL_Y_PROPORCIONALIDAD/
11_MEDIDAS_DE_RESGUARDO/
12_DIALOGO_RESTAURATIVO/
13_RECONSIDERACION_O_APELACION/
14_SEGUIMIENTO/
15_ANEXOS_ORIGINALES/
16_DATOS_ESTRUCTURADOS_JSON/
17_MANIFIESTO_DE_ARCHIVOS/
```

No crear carpetas vacías.

No generar automáticamente:

- `INFORME_CIERRE`.
- `INFORME_CONCLUYENTE`.
- Resolución de reconsideración o apelación.

Si el usuario incorporó uno de esos documentos externamente, incluirlo como anexo vigente, con su hito y origen, sin regenerarlo.

El JSON debe incluir causa, hitos, actuaciones, hechos, evidencias, entrevistas, descargos, notificaciones, medidas, RICE, proporcionalidad, reconsideración, seguimiento y documentos.

El manifiesto debe indicar incluidos, faltantes, invalidados, reemplazados, errores de descarga, hash y fecha de generación.

## 7. Reglas de interfaz

- Usar verde para cumplido.
- Amarillo para pendiente dentro de plazo.
- Rojo para vencido o bloqueante.
- Gris para no aplicable con fundamento.
- Azul para en desarrollo.
- Nunca ocultar rectificaciones o invalidaciones.
- Mostrar `Próxima actuación requerida` en el resumen.
- Diferenciar medidas de resguardo de sanciones.
- La firma de recepción no implica conformidad.
- No usar expresiones penales o estigmatizantes.

## 8. Migración de datos

1. Agregar nuevas columnas/tablas de forma idempotente.
2. Aplicar RLS antes de exponer servicios.
3. Mantener causas antiguas en versión 1.
4. No marcar automáticamente nuevos hitos como cumplidos.
5. Derivar equivalencias solo cuando exista evidencia inequívoca.
6. Registrar `sin información histórica disponible` cuando corresponda.
7. No mover ni renombrar rutas Storage sin un plan de compatibilidad.

## 9. Pruebas obligatorias

### Unitarias

- Todos los tipos de bitácora sobreviven guardar/recargar.
- Cálculo de próximo hito.
- Hitos mutuamente excluyentes.
- Reglas de bloqueo.
- Auditoría de descargos.
- Auditoría de hechos y evidencias.
- Hoja de vida usada solo en proporcionalidad.
- Rectificación conserva registro anterior.
- Exportación clasifica documentos correctamente.

### Integración

- Crear causa versión 2.
- Completar hitos secuenciales.
- Agregar varios avances y archivos.
- Reabrir y comprobar la reconstrucción completa.
- Registrar descargo y visualizarlo en historial y ZIP.
- Vincular evidencia a hecho y exportarla.
- Invalidar actuación y conservarla visible.
- Caso grupal sin mezclar indebidamente registros individuales.
- Reconsideración presentada.
- Plazo vencido sin reconsideración.

### E2E

1. Crear causa ficticia.
2. Registrar apertura y resguardo.
3. Adjuntar notificación.
4. Registrar entrevistas y evidencias.
5. Recibir descargos.
6. Cerrar indagación.
7. Incorporar externamente una decisión ficticia.
8. Notificarla.
9. Registrar reconsideración o vencimiento.
10. Ejecutar seguimiento.
11. Cerrar causa.
12. Volver a abrirla.
13. Verificar todos los pasos y archivos.
14. Exportar ZIP y validar índice, JSON, anexos y manifiesto.

## 10. Criterios finales de aceptación

El trabajo se considera terminado solo si:

- Una causa se reconstruye completamente después de cerrar sesión y volver a abrirla.
- Cada actuación indica fecha, responsable, hito, resultado y documentos.
- Todos los archivos aparecen en un índice único.
- Los avances de hitos aparecen en el historial y en la exportación.
- Hechos y evidencias aparecen en la exportación.
- Citaciones, correos y descargos no se pierden.
- Las rectificaciones no borran la versión anterior.
- Los registros grupales conservan su origen.
- El cierre se bloquea cuando falta una garantía esencial.
- El ZIP contiene todos los antecedentes para Gemini Notebook.
- La aplicación no genera informes ni resoluciones automáticamente.
- Lint, typecheck, unitarias, integración y E2E pasan.
- No se debilitan RLS, auditoría ni aislamiento por tenant.

## 11. Forma de trabajo solicitada a OpenCode

1. No implementar todo en un único cambio.
2. Presentar primero un diagnóstico de impacto y lista exacta de archivos.
3. Proponer migraciones antes de ejecutarlas.
4. Trabajar por fases y commits pequeños.
5. Ejecutar pruebas después de cada fase.
6. Informar archivos modificados, pruebas ejecutadas y riesgos pendientes.
7. Detenerse ante cualquier migración destructiva o ambigüedad normativa.
8. No corregir asuntos no relacionados.
9. No desplegar producción sin autorización expresa.
10. Al finalizar cada fase, entregar una demostración reproducible.

## 12. Primera tarea para OpenCode

Ejecuta solamente la Fase 0 y la Fase 1:

1. Revisa las instrucciones del repositorio.
2. Ejecuta las pruebas base.
3. Confirma la incompatibilidad entre `BitacoraEntry` y `BitacoraEntrySchema`.
4. Corrige la enumeración sin alterar datos existentes.
5. Agrega pruebas de persistencia para `Citación`, `Correo` y `Descargo`.
6. Ejecuta lint, typecheck y pruebas relacionadas.
7. Entrega un informe de resultados.

No inicies todavía las migraciones del expediente unificado ni modifiques producción.

## 13. Estado de implementación 2026-09-24

### Completado

- Fases 1 a 11 implementadas y verificadas en el código.
- Servicio agregado del expediente con hechos, evidencias, actuaciones,
  documentos, reconsideraciones y seguimiento.
- Auditoría reforzada y bloqueantes de cierre centralizados.
- Exportación JSON, Markdown y ZIP con índice, anexos y manifiesto.
- Reglas de transición centralizadas en
  `src/shared/lib/domain/proceduralTransitions.ts`.

### Enforcement server-side

Se agregó la migración forward-only
`20260924100000_enforce_causa_state_transitions.sql`. Crea un trigger sobre
`causas` que, para expedientes versión 2, permite permanecer en la fase,
avanzar como máximo una fase o retroceder. Los expedientes versión 1 quedan
fuera de la regla.

La migración fue aplicada al proyecto remoto `mjhbcqwtjzgvqssfiore` mediante
ejecución SQL directa el 2026-09-24. Su SHA-256 es
`21E5CC0641E4DC6CEAB60F0B2E93FD76839BE7025F416AC97A4258D10A9B369C`.
Los smoke tests confirmaron el trigger habilitado, permisos para
`authenticated` y `service_role`, y cero causas versión 2 existentes al
momento de la aplicación.

Este trigger protege la secuencia de fases. Los bloqueantes documentales y de
debido proceso siguen siendo responsabilidad de la auditoría y deben migrarse
a una RPC transaccional futura si se requiere imponerlos también fuera de la
aplicación.

### Demostración reproducible

1. Crear o seleccionar una causa versión 2 en Recepción.
2. Intentar actualizarla directamente a Resolución: la base debe rechazar la
   operación con `Transición de causa inválida`.
3. Actualizarla a Investigación: la operación debe ser aceptada.
4. Retroceder a Recepción: la operación debe ser aceptada para correcciones
   administrativas.
5. Repetir con una causa versión 1: el trigger no debe bloquear el cambio.

## 14. Verificación de esta entrega

- `npm run lint`: OK.
- `npm test -- --run`: 872/872 tests OK.
- `npm run build:web`: OK.
- `npm run test:e2e`: 87 pasados, 6 omitidos, 0 fallas.
- `git diff --check`: OK.

## 15. Pendientes antes de producción

- Registrar checksum y resultado de smoke tests en la bitácora de
  reconciliación compartida.
- Evaluar una RPC transaccional para imponer también los bloqueantes de
  auditoría fuera de la UI.
