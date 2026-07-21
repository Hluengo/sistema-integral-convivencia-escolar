---
name: reporte-convivencia
description: Genera reporte completo de convivencia escolar con métricas, gráficos y exportación
---

# Workflow: Reporte de Convivencia

Genera un reporte completo de convivencia escolar con análisis estadístico y exportación.

## Fases

### 1. Recolección de Datos
- Consultar casos de convivencia desde Supabase
- Obtener bitácora de actividades
- Recopilar datos de estudiantes y cursos

### 2. Análisis Estadístico
- Calcular métricas clave (casos activos, resueltos, tiempo promedio)
- Identificar tendencias temporales
- Distribución por tipo de conducta
- Distribución por curso/grado

### 3. Generación de Reportes
- Dashboard de métricas en React
- Exportación a PDF con pdf-lib
- Exportación a Excel con xlsx
- Resumen ejecutivo en DOCX

### 4. Visualización
- KPI Cards con tendencias
- Gráficos de líneas (tendencia)
- Gráficos de barras (distribución)
- Tablas de detalle

## Comandos del Workflow
```bash
# 1. Obtener datos
supabase db dump --data-only --table causas

# 2. Ejecutar análisis
npm run test -- --grep "disciplin"

# 3. Generar reporte
npm run build
```

## Agentes Involucrados
- `@analytics` — Cálculos y métricas
- `@database` — Queries Supabase
- `@frontend` — Componentes de visualización
- `@documentation` — Documentación del reporte
