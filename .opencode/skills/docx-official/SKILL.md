---
name: docx-official
description: Genera documentos Word (.docx) para informes, oficios, resoluciones y documentos editables. Trigger: Word, DOCX, documento, oficio, informe edit.
---

# DOCX Official

Genera documentos Word (.docx) editables para el SaaS educativo.

## Stack del Proyecto

- **docx** (9.7.1) — Generación de documentos .docx
- **file-saver** (2.0.5) — Descarga de archivos

## Tipos de Documentos Editables

### Documentos Institucionales
- Informes ejecutivos
- Oficios de respuesta
- Cartas de presentación
- Memorandums internos

### Documentos Pedagógicos
- Planificaciones de curso
- Unidades didácticas
- Sesiones de aprendizaje
- Evaluaciones formativas
- Informes de resultados

### Documentos del Proceso Disciplinario
- Borradores de resolución (editables)
- Cartas de notificación (para personalizar)
- Actas de reunión (para completar)
- Protocolos (para adaptar)

## Plantillas Disponibles

Las plantillas están en `.opencode/templates/`:

| Plantilla | Archivo | Uso |
|---|---|---|
| Sesión aprendizaje | `sesion-aprendizaje.md` | Sesión de clase |
| Planificación anual | `planificacion-anual.md` | Planificación del año |
| Informe UTP | `informe-utp.md` | Informe de la UTP |
| Informe PIE | `informe-pie.md` | Informe del PIE |
| Informe PACI | `informe-paci.md` | Informe del PACI |
| Informe PAI | `informe-pai.md` | Informe del PAI |
| Oficio | `oficio.md` | Comunicación oficial |
| Resolución | `resolucion.md` | Resolución institucional |

## Flujo de Generación

### 1. Seleccionar Plantilla
```typescript
import { Document, Packer, Paragraph, TextRun } from 'docx'
```

### 2. Construir Documento
```typescript
const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
      }
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "INFORME", bold: true, size: 32 })
        ]
      })
    ]
  }]
})
```

### 3. Generar y Descargar
```typescript
import { saveAs } from 'file-saver'
const buffer = await Packer.toBlob(doc)
saveAs(buffer, 'informe.docx')
```

## Funciones de Utilidad

### Para Informes
```typescript
function generarInformeDOCX(datos: {
  titulo: string
  contenido: string
  autor: string
  fecha: string
}): Document {
  return new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: [
        new Paragraph({ children: [new TextRun({ text: datos.titulo, bold: true, size: 32 })] }),
        new Paragraph({ children: [new TextRun({ text: `Fecha: ${datos.fecha}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Autor: ${datos.autor}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: datos.contenido, size: 22 })] }),
      ]
    }]
  })
}
```

### Para Planificaciones
```typescript
function generarPlanificacionDOCX(plan: Planificacion): Document {
  return new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: [
        // Encabezado con datos del curso
        // Objetivos de aprendizaje
        // Secuencia didáctica
        // Evaluación
        // Recursos
      ]
    }]
  })
}
```

## Comandos Relacionados
- `@utp` para planificaciones
- `@curriculum` para diseño curricular
- `@assessment` para evaluaciones
- `@pie` para adaptaciones curriculares
- `@writer` para redacción

## Convenciones
- Siempre incluir encabezado con datos institucionales
- Usar estilos predefinidos (Heading 1, Heading 2, Normal)
- Formato A4 con márgenes de 2.54 cm
- Fuente: Calibri 11pt o Arial 11pt
- Interlineado: 1.15 o 1.5
