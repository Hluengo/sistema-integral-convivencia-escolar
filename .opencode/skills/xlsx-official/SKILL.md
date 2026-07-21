---
name: xlsx-official
description: Genera hojas de cálculo Excel (.xlsx) para reportes de datos, estadísticas y exportación. Trigger: Excel, XLSX, hoja de cálculo, datos, exportar.
---

# XLSX Official

Genera hojas de cálculo Excel (.xlsx) para reportes y exportación de datos.

## Stack del Proyecto

- **xlsx** — Lectura/escritura de archivos Excel (instalar si no está)
- **file-saver** (2.0.5) — Descarga de archivos

## Tipos de Reportes

### Reportes de Convivencia
- Listado de casos por período
- Casos por tipo de conducta
- Casos por curso/grado
- Tiempo de resolución
- Estadísticas de medidas aplicadas

### Reportes Académicos
- Rendimiento por curso
- Distribución de notas por asignatura
- Tendencia de rendimiento
- Comparativa SIMCE

### Reportes Administrativos
- Asistencia por curso
- Inasistencias por período
- Listado de estudiantes
- Listado de apoderados

### Reportes PIE
- Estudiantes con NEE
- Adaptaciones curriculares activas
- Progreso individual
- Evaluaciones PIE

## Estructura de Hojas

### Hoja 1: Resumen
```
| Métrica | Valor | Variación |
|---------|-------|-----------|
| Casos activos | 12 | -3 |
| Casos cerrados | 45 | +8 |
| Resolución promedio | 15 días | -2 |
```

### Hoja 2: Detalle
```
| ID | Fecha | Curso | Tipo | Estado | Responsable |
|----|-------|-------|------|--------|-------------|
| 001 | 2025-07-21 | 3°B | Leve | Cerrado | Jefe UTP |
```

### Hoja 3: Estadísticas
```
| Tipo de Conducta | Cantidad | % |
|-------------------|----------|---|
| Inasistencia | 25 | 35% |
| Indisciplina | 20 | 28% |
```

## Flujo de Generación

### 1. Preparar Datos
```typescript
const datos = await supabase.from('causas').select('*')
```

### 2. Crear Hoja
```typescript
import * as XLSX from 'xlsx'

const ws = XLSX.utils.json_to_sheet(datos)
```

### 3. Aplicar Estilos
```typescript
// Agregar encabezados
const ws = XLSX.utils.aoa_to_sheet([
  ['ID', 'Fecha', 'Curso', 'Tipo', 'Estado'],
  ...datos.map(d => [d.id, d.fecha, d.curso, d.tipo, d.estado])
])
```

### 4. Generar y Descargar
```typescript
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Casos')
XLSX.writeFile(wb, 'reporte-convivencia.xlsx')
```

## Funciones de Utilidad

### Para Reportes de Convivencia
```typescript
function generarReporteConvivencia(casos: Caso[]): Workbook {
  const wb = XLSX.utils.book_new()
  
  // Hoja resumen
  const resumen = calcularResumen(casos)
  const wsResumen = XLSX.utils.json_to_sheet(resumen)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  
  // Hoja detalle
  const wsDetalle = XLSX.utils.json_to_sheet(casos)
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')
  
  return wb
}
```

### Para Reportes Académicos
```typescript
function generarReporteRendimiento(notas: Nota[]): Workbook {
  // Hoja por curso
  // Hoja de estadísticas
  // Hoja de comparativa SIMCE
}
```

## Comandos Relacionados
- `@analytics` para cálculos de métricas
- `@database` para queries de datos
- `@frontend` para integración en UI
- `@documentation` para documentación de reportes

## Convenciones
- Siempre incluir encabezados descriptivos
- Formato de fechas: DD/MM/YYYY
- Números con separadores de miles
- Porcentajes con 2 decimales
- Ancho de columnas auto-ajustado
- Filtros automáticos en encabezados
- Congelar primera fila (encabezados)
