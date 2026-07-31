# 10 — Document Generation

> **Referencia detallada:** `docs/architecture/document-generation.md`

## DOCX (Word)

Templates: amonestacion, compromiso, derivacion
Builder: docx/builder.ts → docx/helpers/

## PDF Analysis

Pipeline: Upload → extract (pdfjs-dist) → parse (regex) → match → suggest

## AI Drafts

4 tipos: notificacion_apertura, citacion_entrevista, informe_cierre_indagacion, informe_concluyente

## Ficha disciplinaria individual

El modal individual de Anotaciones funciona como ficha operativa, no como biblioteca documental. Sus pestañas son: Estado, Revisar PDF, Carta e Historial.

Flujo principal: Revisar PDF -> confirmar análisis -> Ir a Carta -> Crear -> Editar -> Imprimir -> Marcar como procesada. La ficha disciplinaria de Anotaciones concentra la gestión de cartas y documentos asociados al estudiante.

Antes de cerrar el trámite, el tipo visible en el generador se valida contra la etapa calculada con las anotaciones ya registradas. Una derivación no puede marcarse como procesada con menos de 15 negativas confirmadas; la observación de cierre documenta lo realizado, pero nunca cambia el tipo de carta.

En el flujo actual, la realización de una carta se confirma explícitamente mediante el evento `processed_manually`. Imprimir no cierra automáticamente el trámite. Abrir el generador o mantener una carta pendiente no agrega entradas al historial. Los eventos históricos `created` y `suggested` se conservan en la base, pero la interfaz no los muestra. Los eventos `registered` y `printed` siguen siendo interpretados para mantener compatibilidad con cartas emitidas antes de este cambio.

## Editor interno de cartas disciplinarias

`AnotacionesDocumentGenerator` es un editor liviano dentro de la pestaña Carta de la ficha disciplinaria. No muestra ni permite seleccionar anotaciones negativas; solo muestra la cantidad considerada y conserva internamente trazabilidad (`negativeCount`, `sourceAnalysisId`, `sourceProcessId`).

Los textos editables viven en `letterContent` (`motivo`, `descripcion`, `medida`, `acuerdos`, `cierre`, `observaciones`) y alimentan la vista A4 y la impresión. Al usar **Marcar como procesada** se guarda `cartas_disciplinarias.content_snapshot` y se registra el evento de cierre, permitiendo reabrir o imprimir el contenido exacto aunque cambien los textos base de plantilla.

## Constancia de carta física previa

La pestaña Carta permite registrar una Amonestación o Carta de Compromiso emitida físicamente antes de la adopción de la plataforma. Se almacena en `cartas_disciplinarias` con `origin = 'physical'`, `school_year` derivado de la fecha y `annotations_count = 0`; el RPC autenticado `register_physical_carta` crea en una sola transacción la constancia y su evento `registered`.

La constancia no crea anotaciones ni abre el generador. Solo afecta la progresión del mismo año escolar: Amonestación física habilita Compromiso y Compromiso físico habilita Derivación. Las constancias de años anteriores permanecen como historial y no afectan la progresión anual vigente.

## Estado efectivo en la tabla de Anotaciones

La tabla no usa el conteo como única fuente de verdad. Para el año escolar vigente, una carta
realizada (`registered`, `printed` o `processed_manually`) puede elevar la etapa efectiva sobre
el tramo numérico. Por ejemplo, una Derivación procesada con 14 negativas se muestra y filtra
como Derivación, manteniendo intacto el conteo de 14. Las cartas pendientes se muestran como
pendientes, pero no elevan por sí solas la etapa disciplinaria efectiva.
