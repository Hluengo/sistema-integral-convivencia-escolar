# 10 — Document Generation

> **Referencia detallada:** `docs/architecture/document-generation.md`

## DOCX (Word)
Templates: amonestacion, compromiso, derivacion
Builder: docx/builder.ts → docx/helpers/

## PDF Analysis
Pipeline: Upload → extract (pdfjs-dist) → parse (regex) → match → suggest

## AI Drafts
4 tipos: notificacion_apertura, citacion_entrevista, informe_cierre_indagacion, informe_concluyente
