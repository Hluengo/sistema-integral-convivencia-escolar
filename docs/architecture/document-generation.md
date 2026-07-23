# Document Generation

## DOCX Generation (`src/shared/lib/docx/`)

### Arquitectura

```
docx/
├── index.ts          → Entry point (exporta buildDocument)
├── builder.ts        → Construye documento DOCX completo
├── types.ts          → BuildDocxParams, DocxTemplateType
├── constants.ts      → Constantes de estilo y formato
├── templates/
│   ├── header.ts         → Encabezado institucional (logo, datos)
│   ├── amonestacion.ts   → Carta de amonestación escrita
│   ├── compromiso.ts     → Carta de compromiso conductual
│   └── derivacion.ts     → Carta de derivación
└── helpers/
    ├── paragraphs.ts     → Bloques de párrafos reutilizables
    ├── tables.ts         → Tablas de datos y firmas
    ├── signature.ts      → Bloques de firma
    └── annotations.ts    → Formateo de listado de anotaciones
```

### Documentos Soportados

| Tipo | Template | Descripción |
|------|----------|-------------|
| `amonestacion` | `templates/amonestacion.ts` | Amonestación escrita por faltas |
| `compromiso` | `templates/compromiso.ts` | Carta de compromiso conductual |
| `derivacion` | `templates/derivacion.ts` | Derivación a equipo directivo |

## PDF Analysis (Server-side)

### Pipeline

```
PDF upload → Supabase Storage → POST /api/process-disciplinary-pdf
  ├── Download PDF
  ├── Validate (%PDF-, ≤10MB)
  ├── SHA-256 hash
  ├── Text extraction (pdfjs-dist)
  ├── Metadata extraction (regex):
  │   ├── Student name (ExtractStudentName)
  │   └── Course (extractCourse)
  ├── Annotation parsing (regex):
  │   ├── splitAnnotationBlocks (by DD/MM/YYYY)
  │   ├── classifyAnnotation (Negativa/Positiva/Información)
  │   └── Deduplication
  ├── Student matching:
  │   ├── Exact name → 0.99 confidence
  │   ├── NFD-stripped → 0.94
  │   ├── Word overlap ≥50% → variable
  │   └── Course fallback
  ├── Letter suggestion (RPC get_suggested_letter_type)
  └── Persist to document_analyses
```

## AI Drafted Documents (Server-side)

| Documento | System Prompt Origin |
|-----------|-------------------|
| `notificacion_apertura` | Hardcoded en route |
| `citacion_entrevista` | Hardcoded en route |
| `informe_cierre_indagacion` | DB table `document_templates` |
| `informe_concluyente` | DB table `document_templates` |

## Document Flow (Frontend)

```
AnotacionesView
  └── AnotacionesDocumentGenerator
      ├── DocTypeSelector → Tipo de carta
      ├── DocumentForm → Datos del documento
      ├── DocumentPreview → Vista previa (DOCX mock)
      ├── DocumentWarnings → Alertas de debido proceso
      └── Export → downloadCartaPdf (pdf-lib) o DOCX nativo

DocumentosView
  └── DocumentosView (unified hub)
      ├── Causas: cartas existentes
      └── Anotaciones: generador de documentos
```
