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

Flujo principal: Revisar PDF -> confirmar análisis -> Ir a Carta -> Crear -> Editar -> Imprimir -> Marcar como procesada. La pestaña Carta solo gestiona la carta sugerida o pendiente del estudiante; DocumentosView mantiene la biblioteca/documentación amplia.

En el flujo actual, la realización de una carta se confirma explícitamente mediante el evento `processed_manually`. Imprimir no cierra automáticamente el trámite. Los eventos históricos `registered` y `printed` siguen siendo interpretados para mantener compatibilidad con cartas emitidas antes de este cambio. Una fila nueva en `cartas_disciplinarias` sin confirmación se considera pendiente.
## Editor interno de cartas disciplinarias

`AnotacionesDocumentGenerator` es un editor liviano dentro de la pestaña Carta de la ficha disciplinaria. No muestra ni permite seleccionar anotaciones negativas; solo muestra la cantidad considerada y conserva internamente trazabilidad (`negativeCount`, `sourceAnalysisId`, `sourceProcessId`).

Los textos editables viven en `letterContent` (`motivo`, `descripcion`, `medida`, `acuerdos`, `cierre`, `observaciones`) y alimentan la vista A4 y la impresión. Al usar **Marcar como procesada** se guarda `cartas_disciplinarias.content_snapshot` y se registra el evento de cierre, permitiendo reabrir o imprimir el contenido exacto aunque cambien los textos base de plantilla.
