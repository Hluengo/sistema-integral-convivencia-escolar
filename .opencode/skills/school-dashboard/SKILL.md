---
name: school-dashboard
description: Diseña y construye dashboards educativos con métricas, gráficos, reportes. Trigger: dashboard, métricas, gráficos,reportes, educación.
---

# School Dashboard

Guía para dashboards educativos.

## Métricas Clave

### Asistencia
- % asistencia diaria
- Tasa de inasistencia
- Tendencia mensual
- Comparativa por curso

### Convivencia
- Casos activos
- Casos cerrados
- Tipos de conducta
- Tiempo de resolución

### Académico
- Promedio general
- Rendimiento por asignatura
- Distribución de notas
- Tendencia semestral

### PIE
- Estudiantes con NEE
- Adaptaciones activas
- Progreso individual
- Evaluaciones

## Componentes

### KPI Cards
```tsx
<div className="bg-white p-4 rounded-lg shadow">
  <p className="text-sm text-gray-500">Asistencia</p>
  <p className="text-2xl font-bold">92.5%</p>
  <p className="text-xs text-green-500">+2.3% vs mes anterior</p>
</div>
```

### Gráficos
- Líneas: tendencias temporales
- Barras: comparativas
- Tortillas: distribución
- Heatmaps: patrones

### Tablas
- Datos detallados
- Filtros interactivos
- Exportación CSV/Excel
- Paginación

## Datos
- Supabase como fuente
- Queries optimizadas
- Caché en cliente
- Actualización periódica

## Comandos Relacionados
- `@analytics` para métricas
- `@frontend` para UI
- `@database` para queries
