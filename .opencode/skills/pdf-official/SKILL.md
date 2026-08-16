---
name: pdf-official
description: Genera y gestiona documentos PDF para informes, cartas, resoluciones y documentos escolares. Trigger: PDF, informe PDF, carta, resolución, documento.
---

# PDF Official

Genera documentos PDF profesionales para el SaaS educativo.

## Stack del Proyecto

- **pdf-lib** (1.17.1) — Creación y manipulación de PDFs
- **pdfjs-dist** (6.1.200) — Lectura y renderizado de PDFs existentes

## Tipos de Documentos

### Informes Institucionales
- Informe de convivencia escolar
- Informe PIE / PAI / PACI
- Informe DIA (Diagnóstico Institucional)
- Informe SIMCE
- Informe UTP

### Documentos Disciplinarios
- Resolución de caso
- Carta de notificación
- Carta de invitación
- Acta de entrevista de descargos
- Acta de reunión APAFER

### Documentos Administrativos
- Oficios institucionales
- Minutas de reunión
- Protocolos de actuación
- Planificaciones anuales

## Plantillas Disponibles

Las plantillas están en `.opencode/templates/`:

| Plantilla | Archivo | Uso |
|---|---|---|
| Resolución caso | `resolucion-caso.md` | Resolución final de caso |
| Carta notificación | `carta-notificacion.md` | Notificación formal |
| Carta invitación | `carta-invitacion.md` | Invitación a reunión |
| Informe convivencia | `informe-convivencia.md` | Informe de convivencia |
| Informe PIE | `informe-pie.md` | Informe del PIE |
| Informe UTP | `informe-utp.md` | Informe de la UTP |
| Informe DIA | `informe-dia.md` | Diagnóstico institucional |
| Informe SIMCE | `informe-simce.md` | Análisis SIMCE |
| Oficio | `oficio.md` | Comunicación oficial |
| Acta reunión | `acta-reunion.md` | Acta de reunión |
| Acta APAFER | `acta-apafers.md` | Acta de directorio APAFER |
| Acta descargos | `acta-entrevista-descargos.md` | Entrevista de descargos |
| Minuta | `minuta.md` | Minuta de reunión |
| Protocolo | `protocolo.md` | Protocolo de actuación |
| Planificación | `planificacion-anual.md` | Planificación anual |

## Flujo de Generación

### 1. Seleccionar Plantilla
```typescript
import { getTemplate } from '../shared/lib/templates'
const template = getTemplate('resolucion-caso')
```

### 2. Llenar Datos
```typescript
import { fillTemplate } from '../shared/lib/templates'
const doc = fillTemplate(template, {
  estudiante: 'Juan Pérez',
  curso: '3° Básico B',
  fecha: '2025-07-21',
  tipo_falta: 'leve',
  descripcion: '...',
})
```

### 3. Generar PDF
```typescript
import { PDFDocument } from 'pdf-lib'
const pdfDoc = await PDFDocument.create()
// Agregar contenido...
const pdfBytes = await pdfDoc.save()
```

### 4. Descargar
```typescript
import { saveAs } from 'file-saver'
const blob = new Blob([pdfBytes], { type: 'application/pdf' })
saveAs(blob, 'resolucion-caso.pdf')
```

## Funciones de Utilidad

### Para Informes
```typescript
// Generar informe desde datos de causa
function generarInformeConvivencia(causa: Causa): PDFDocument {
  const pdfDoc = await PDFDocument.create()
  // Agregar encabezado con logo
  // Agregar metadatos del caso
  // Agregar timeline de eventos
  // Agregar resolución
  // Agregar firmas
  return pdfDoc
}
```

### Para Cartas
```typescript
// Generar carta de notificación
function generarCartaNotificacion(datos: {
  destinatario: string
  asunto: string
  cuerpo: string
  firma: string
}): PDFDocument { ... }
```

### Para Resoluciones
```typescript
// Generar resolución de caso
function generarResolucion(causa: Causa): PDFDocument {
  // Encabezado institucional
  // Considerandos
  // Resolutivo
  // Firme
}
```

## Comandos Relacionados
- `@legal` para revisión de contenido legal
- `@writer` para redacción del texto
- `@database` para obtener datos de causa
- `@meeting` para actas de reunión
- `@documentation` para documentación

## Convenciones
- Siempre incluir pie de página con datos institucionales
- Usar fuentes estándar (Helvetica, Times-Roman)
- Numeración de páginas
- Formato A4 (595.28 x 841.89 puntos)
- Margen mínimo: 72 puntos (1 pulgada)
