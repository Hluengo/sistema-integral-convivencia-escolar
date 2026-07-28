# Document Generation

## DOCX Generation (`src/shared/lib/docx/`)

### Arquitectura

```
docx/
â”œâ”€â”€ index.ts          â†’ Entry point (exporta buildDocument)
â”œâ”€â”€ builder.ts        â†’ Construye documento DOCX completo
â”œâ”€â”€ types.ts          â†’ BuildDocxParams, DocxTemplateType
â”œâ”€â”€ constants.ts      â†’ Constantes de estilo y formato
â”œâ”€â”€ templates/
â”‚   â”œâ”€â”€ header.ts         â†’ Encabezado institucional (logo, datos)
â”‚   â”œâ”€â”€ amonestacion.ts   â†’ Carta de amonestaciÃ³n escrita
â”‚   â”œâ”€â”€ compromiso.ts     â†’ Carta de compromiso conductual
â”‚   â””â”€â”€ derivacion.ts     â†’ Carta de derivaciÃ³n
â””â”€â”€ helpers/
    â”œâ”€â”€ paragraphs.ts     â†’ Bloques de pÃ¡rrafos reutilizables
    â”œâ”€â”€ tables.ts         â†’ Tablas de datos y firmas
    â”œâ”€â”€ signature.ts      â†’ Bloques de firma
    â””â”€â”€ annotations.ts    â†’ Formateo de listado de anotaciones
```

### Documentos Soportados

| Tipo           | Template                    | DescripciÃ³n                     |
| -------------- | --------------------------- | ------------------------------- |
| `amonestacion` | `templates/amonestacion.ts` | AmonestaciÃ³n escrita por faltas |
| `compromiso`   | `templates/compromiso.ts`   | Carta de compromiso conductual  |
| `derivacion`   | `templates/derivacion.ts`   | DerivaciÃ³n a equipo directivo   |

## PDF Analysis (Server-side)

### Pipeline

```
PDF upload â†’ Supabase Storage â†’ POST /api/process-disciplinary-pdf
  â”œâ”€â”€ Download PDF
  â”œâ”€â”€ Validate (%PDF-, â‰¤10MB)
  â”œâ”€â”€ SHA-256 hash
  â”œâ”€â”€ Text extraction (pdfjs-dist)
  â”œâ”€â”€ Metadata extraction (regex):
  â”‚   â”œâ”€â”€ Student name (ExtractStudentName)
  â”‚   â””â”€â”€ Course (extractCourse)
  â”œâ”€â”€ Annotation parsing (regex):
  â”‚   â”œâ”€â”€ splitAnnotationBlocks (by DD/MM/YYYY)
  â”‚   â”œâ”€â”€±…ÍÍ¥™å¹¹½Ñ…Ñ¥½¸€¡9•…Ñ¥Ù„½A½Í¥Ñ¥Ù„½%¹™½Éµ…§Í¸¤(€ƒŠR€€ƒŠRSŠRŠRFVGWÆ–6F–öà¢)IÎ)H)H7GVFVçBÖF6†–æs ¢)H")IÎ)H)HW†7BæÖR(i"ã“’6öæf–FVæ6P¢)H")IÎ)H)HädB×7G&—VB(i"ã“@¢)H")IÎ)H)HÛÜ™İ™\›\8¢iML	H8¡¤ˆ˜\šXX›Bˆ8¥ ˆ8¥%8¥ 8¥ Ûİ\œÙH˜[˜XÚÂˆ8¥'8¥ 8¥  Letter suggestion (RPC get_suggested_letter_type)
  â””â”€â”€ Persist to document_analyses
```

## AI Drafted Documents (Server-side)

 | Documento                   | System Prompt Origin          |
| --------------------------- | ----------------------------- |
| `notificacion_apertura`     | Hardcoded en route            |
| `citacion_entrevista`       | Hardcoded en route            |
| `informe_cierre_indagacion` | DB table `document_templates` |
| `informe_concluyente`       | DB table `document_templates` |

## Document Flow (Frontend)

```
AnotacionesView
  â””â”€â”€ AnotacionesDocumentGenerator
      â”œâ”€â”€ DocTypeSelector â†’ Tipo de carta
      â”œâ”€â”€ DocumentForm â†’ Datos del documento
      â”œâ”€â”€ DocumentPreview â†’ Vista previa (DOCX mock)
      â”œâ”€â”€ DocumentWarnings â†’ Alertas de debido proceso
      â””â”€â”€ Imprimir â†’ volver a la aplicaciÃ³n â†’ Marcar como procesada

DocumentosView
  â””â”€â”€ DocumentosView (unified hub)
      â”œâ”€â”€ Causas: cartas existentes
      â””â”€â”€ Anotaciones: generador de documentos
```

La impresiÃ³n no completa el trÃ¡mite por sÃ­ sola. **Marcar como procesada** guarda el
`content_snapshot` final y agrega el evento `processed_manually` a `carta_events`. Los eventos
histÃ³ricos `registered` y `printed` se conservan para compatibilidad.

### Carta fÃ­sica existente

La ficha individual puede registrar como constancia una AmonestaciÃ³n o un Compromiso
ya emitidos en papel. El registro no genera una plantilla digital ni modifica el conteo
de anotaciones. La constancia queda identificada por origen y aÃ±o escolar, y habilita
la medida inmediatamente siguiente solo dentro de ese mismo aÃ±o.
