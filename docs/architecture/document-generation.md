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

| Tipo           | Template                    | Descripción                     |
| -------------- | --------------------------- | ------------------------------- |
| `amonestacion` | `templates/amonestacion.ts` | Amonestación escrita por faltas |
| `compromiso`   | `templates/compromiso.ts`   | Carta de compromiso conductual  |
| `derivacion`   | `templates/derivacion.ts`   | Derivación a equipo directivo   |

## PDF Analysis (Server-side)

### Pipeline

```
PDF upload → Supabase Storage → POST /api/process-disciplinary-pdf
  ├── Download PDF
  ├── Validate (%PDF-, ≤10MB, ≤80 páginas)
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

La confirmación del proceso (`/api/process-disciplinary-pdf/confirm`) no confía en el payload del cliente: exige rol operativo, re-descarga el PDF, recalcula el hash, valida que el `analysisId` pertenezca al tenant y al archivo, y solo persiste anotaciones confirmadas que existan en la salida del parser.

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
  └── AnotacionesDocumentGenerator
      ├── DocTypeSelector → Tipo de carta
      ├── DocumentForm → Datos del documento
      ├── DocumentPreview → Vista previa (DOCX mock)
      ├── DocumentWarnings → Alertas de debido proceso
      └── Imprimir → volver a la aplicación → Marcar como procesada → Archivar

```

La impresión no completa el trámite por sí sola. **Marcar como procesada** guarda el
`content_snapshot` final y agrega el evento `processed_manually` a `carta_events`. Los eventos
históricos `registered` y `printed` se conservan para compatibilidad.

Después de la entrevista con apoderado/a, la carta procesada puede marcarse como **Archivada**.
Este hito agrega el evento `archived` a `carta_events` y registra que el documento fue firmado y
archivado en el expediente físico. No cambia `cartas_disciplinarias.status`, porque ese campo sigue
representando vigencia administrativa (`Vigente`, `Cumplida`, `Incumplida`, `Anulada`).

Abrir el generador no registra una carta en el historial. Las cartas pendientes permanecen
disponibles para editar o imprimir, pero solo se incorporan al historial al ser procesadas,
registradas, impresas mediante el flujo histórico o anuladas. Los eventos preliminares
`created` y `suggested` existentes se conservan en Supabase y se omiten en la interfaz.

### Carta física existente

La ficha individual puede registrar como constancia una Amonestación o un Compromiso
ya emitidos en papel. El registro no genera una plantilla digital ni modifica el conteo
de anotaciones. La constancia queda identificada por origen y año escolar, y habilita
la medida inmediatamente siguiente solo dentro de ese mismo año.

### Proyección a la tabla principal

El estado visible de un estudiante combina dos fuentes:

1. el tramo sugerido por el número de anotaciones negativas;
2. la carta de mayor nivel efectivamente realizada durante el año vigente.

La segunda prevalece cuando representa una etapa superior. Una Ficha de Derivación marcada
como procesada aparece en Estado, en el filtro Derivación y en las exportaciones, aunque el
conteo permanezca bajo 15 por existir un Compromiso físico habilitante. El estado documental
se presenta como `Pendiente`, `Procesada` o `Archivada` a partir de `carta_events`;
`status = Vigente` continúa representando la vigencia administrativa de la carta y no el cierre del
trámite.
