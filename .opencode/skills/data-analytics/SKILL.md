---
name: data-analytics
description: Análisis de datos educativos, métricas, KPIs, dashboards y reportes estadísticos. Trigger: analytics, métricas, datos, estadísticas, KPI, dashboard, análisis.
---

# Data Analytics

Análisis cuantitativo de datos educativos para el SaaS.

## Métricas Clave del SaaS

### Convivencia Escolar
- **Casos activos** — Total abiertos hoy
- **Tasa de resolución** — Cerrados / Total × 100
- **Tiempo promedio de resolución** — Días desde apertura hasta cierre
- **Recidiva** — % de estudiantes con más de 1 caso
- **Distribución por tipo** — Leve / Grave / Gravísima
- **Distribución por curso** — Casos por grado/sección

### Académico
- **Promedio general** — Nota media del establecimiento
- **Rendimiento por asignatura** — Comparativa entre áreas
- **Tendencia semestral** — Evolución de notas
- **SIMCE** — Resultados vs. meta institucional

### Asistencia
- **Asistencia diaria** — % presente / matrícula
- **Inasistencia recurrente** — % con >3 inasistencias
- **Tendencia mensual** — Evolución de asistencia

### PIE
- **Estudiantes con NEE** — Total y por tipo
- **Adaptaciones activas** — Vigentes / vencidas
- **Progreso individual** — Metas alcanzadas

## Fuentes de Datos

### Supabase (Principal)
```typescript
// Casos de convivencia
const { data: causas } = await supabase
  .from('causas')
  .select('*')
  .gte('created_at', fechaInicio)

// Estudiantes
const { data: students } = await supabase
  .from('students')
  .select('*')

// Bitácora
const { data: bitacora } = await supabase
  .from('bitacora_entries')
  .select('*')
  .order('created_at', { ascending: false })
```

### RPCs de Supabase
```typescript
// Métricas pre-calculadas
const { data: metricas } = await supabase
  .rpc('get_metricas_convivencia', {
    p_tenant_id: tenantId,
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin
  })
```

## Funciones de Análisis

### Estadística Descriptiva
```typescript
function calcularEstadisticas(datos: number[]) {
  const n = datos.length
  const media = datos.reduce((a, b) => a + b, 0) / n
  const mediana = [...datos].sort((a, b) => a - b)[Math.floor(n / 2)]
  const desviacion = Math.sqrt(
    datos.reduce((sum, x) => sum + Math.pow(x - media, 2), 0) / n
  )
  return { media, mediana, desviacion, min: Math.min(...datos), max: Math.max(...datos) }
}
```

### Tendencias
```typescript
function calcularTendencia(datos: { fecha: string; valor: number }[]) {
  const n = datos.length
  const sumX = datos.reduce((s, d, i) => s + i, 0)
  const sumY = datos.reduce((s, d) => s + d.valor, 0)
  const sumXY = datos.reduce((s, d, i) => s + i * d.valor, 0)
  const sumX2 = datos.reduce((s, d, i) => s + i * i, 0)
  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return { pendiente, esCreciente: pendiente > 0 }
}
```

### Distribución por Categoría
```typescript
function distribucionPorCategoria<T extends Record<string, any>>(
  datos: T[],
  campo: keyof T
): Record<string, number> {
  return datos.reduce((acc, d) => {
    const clave = String(d[campo])
    acc[clave] = (acc[clave] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}
```

## Integración con Frontend

### Hooks para Métricas
```typescript
// src/hooks/useMetricas.ts
export function useMetricasConvivencia(fechaInicio: Date, fechaFin: Date) {
  return useQuery({
    queryKey: ['metricas', 'convivencia', fechaInicio, fechaFin],
    queryFn: () => fetchMetricasConvivencia(fechaInicio, fechaFin),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
```

### Componentes de Dashboard
```typescript
// KPI Card
<KpiCard
  titulo="Casos Activos"
  valor={metricas.casosActivos}
  variacion={metricas.variacionCasos}
  icono="folder-open"
/>

// Gráfico de tendencia
<LineChart data={metricas.tendenciaCasos} />

// Tabla de distribución
<BarChart data={metricas.distribucionTipo} />
```

## Comandos Relacionados
- `@database` para queries optimizadas
- `@frontend` para componentes de visualización
- `@analytics` para cálculos estadísticos
- `@school-dashboard` para diseño de dashboards
- `@documentation` para documentación de métricas
