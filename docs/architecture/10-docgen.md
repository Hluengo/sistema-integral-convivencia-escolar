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

Flujo principal: Revisar PDF -> confirmar análisis -> Ir a Carta -> Crear/Imprimir/Descargar/Registrar. La pestaña Carta solo gestiona la carta sugerida o pendiente del estudiante; DocumentosView mantiene la biblioteca/documentación amplia.

La realización de una carta se valida por eventos comprobables en `carta_events`: `registered`, `printed`, `downloaded_pdf`, `downloaded_word` o `processed_manually`. Una fila en `cartas_disciplinarias` sin esos eventos se considera pendiente, no emitida.
