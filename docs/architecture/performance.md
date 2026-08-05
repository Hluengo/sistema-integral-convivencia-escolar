# Performance Architecture

## Build Optimization

### Code Splitting (Vite manualChunks)

El build de producción divide el código en 11 chunks:

| Chunk         | Contenido                                        | Tamaño Aprox. |
| ------------- | ------------------------------------------------ | ------------- |
| `vendor`      | React, scheduler, radix, tanstack, zustand, etc. | 671 KB        |
| `pdf`         | pdf-lib, pdfjs-dist                              | 850 KB        |
| `docx`        | docx library                                     | 343 KB        |
| `supabase`    | @supabase/supabase-js                            | 205 KB        |
| `index`       | App shell y shared                               | 292 KB        |
| `anotaciones` | Módulo de anotaciones                            | 50 KB         |
| `new-process` | Wizard nuevo proceso                             | 23 KB         |
| `causas`      | Gestión de casos                                 | 18 KB         |
| `docs`        | Documentos                                       | 12 KB         |
| `ai-advisor`  | Asesor AI                                        | 9 KB          |
| `timeline`    | Timeline de caso                                 | 2 KB          |

### Circular Chunk Warnings

El build emite warnings de chunks circulares debido a la configuración de `manualChunks`. Son advertencias conocidas y no afectan el funcionamiento.

## Lazy Loading

7+ componentes cargados con `React.lazy()` + `<Suspense>`:

- Sidebar, Header, MainContent
- LoginPage, NewCausaModal, ShortcutsModal, OnboardingTour
- InteractiveTimeline, EditCausaModal
- AnotacionesStudentDetailModal, NewDisciplinaryProcessModal
- AnotacionesDocumentGenerator

## Cache Strategy

### Server-side

- **In-memory cache**: 5-min TTL, max 100 entries
- **Endpoints**: advisor-chat, improve-text
- **Key**: SHA256 del request payload

### Client-side (React Query)

- **Courses**: staleTime 30 min, cacheTime infinita
- **Students**: staleTime 10 min, cacheTime infinita
- **Dashboard KPIs, rankings y tendencias**: staleTime 30 s; las escrituras siguen invalidando las consultas de forma selectiva. El panel histórico usa el ciclo escolar marzo-diciembre y la consulta de anotaciones sólo lee `date_time`, `severity` y `type` con filtro por `tenant_id`.
- **No refetch on window focus** (configuración global)

### Renderizado y telemetría

- Los consumidores de Zustand usan selectores parciales; los datos derivados de causas se recalculan solo cuando cambia el arreglo de causas.
- Sentry, PostHog y Web Vitals se inicializan 2 s después del primer render para no competir con la carga inicial. Sentry usa `@sentry/browser` sin Session Replay; Web Vitals recibe adaptadores desde `loadTelemetry()` y no importa Sentry/PostHog de forma estática.
- Las pestañas Resumen, Ruta y Bitácora del timeline usan `React.memo` sin modificar sus contratos.

### Fuentes legales

- Las fuentes jurídicas se normalizan una sola vez por instancia del servidor y luego se reutilizan para puntuar consultas AI.

### Expedientes y Supabase

- **Listado liviano**: `fetchCausas()` obtiene solo los metadatos necesarios para la tabla y las métricas.
- **Detalle bajo demanda**: `fetchCausaDetails(causaId)` obtiene historial y checklist únicamente al gestionar ese expediente; el resultado queda en el store durante la sesión.
- **Autoguardado diferencial**: al editar, se compara el estado previo con el actual. Se actualiza solamente la entidad afectada y los ítems creados, modificados o eliminados; no se reescriben colecciones completas.
- **Caché aislada por tenant**: las claves de React Query incluyen `tenant_id`, impidiendo reutilizar metadatos o antecedentes entre establecimientos durante una misma sesión.
- **Invalidación selectiva sin reconsulta**: una escritura exitosa actualiza sólo el expediente y detalle cacheados; al eliminar, se descarta exclusivamente la entrada de esa causa.
- **Telemetría agregada**: se registran duración, ámbito (listado o detalle) y cantidad de registros, sin IDs, nombres, RUT ni contenido del expediente.
- **Índices por patrón de consulta**: la migración `20260803004959_add_query_pattern_indexes.sql` agrega compuestos para lecturas frecuentes por tenant, estudiante, fecha, estado y ordenamiento, incluyendo importación Excel, anotaciones, cartas, procesos PDF y documentos institucionales.

### Próxima etapa: paginación respaldada por índices

La paginación por cursor no se activa todavía porque requiere medir el volumen real y agregar mediante migración los índices que respalden el orden y filtros usados. Se mantiene el límite actual para no alterar búsqueda, conteos ni filtros de los expedientes activos sin esa verificación.

## Performance Monitoring

- **Sentry**: Error tracking + performance traces sin Session Replay
- **PostHog**: Analytics + feature flags
- **Web Vitals**: Reportados a analytics
- **React Doctor**: Static analysis de buenas prácticas React

## Bundle Size

| Métrica               | Valor   |
| --------------------- | ------- |
| Total dist            | ~5 MB   |
| Módulos transformados | ~3,452  |
| Build time            | ~16s    |
| JS total (gzip)       | ~800 KB |
| CSS total (gzip)      | ~15 KB  |

## Known Optimizations

- PDF worker es el chunk más grande (1.25 MB). Ya está optimizado con `includeFiles` en vercel.json
- React + vendor juntos para evitar circular deps (decision consciente)
- Feature chunks separados por módulo funcional
