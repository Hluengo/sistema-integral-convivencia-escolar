# Future Roadmap

> **Última verificación:** 2026-08-03 | Se contrastó cada ítem contra el código y la base de datos reales.

## Corto Plazo (1-3 meses)

### Testing

- [x] Unificar tests unitarios en Node Test Runner
- [x] Agregar cobertura base faltante de stores/hooks vigentes
- [x] E2E tests con Playwright para flujos críticos (`tests/*.spec.ts`)
- [x] Alcanzar >60% cobertura — **85.66% líneas / 85.57% ramas / 84.77% funciones** al 2026-08-03

> ✅ `authStore`, `uiStore`, `toastStore` y selectores/acciones síncronas de `causasStore` tienen cobertura base desde el 2026-08-02; hooks críticos (`causaPersistence`, `useNotifications`) ya estaban cubiertos. `gearStore` y `riceMeasures` fueron reconciliados como referencias documentales obsoletas: no existen símbolos vigentes en `src/`. `npm run test:coverage` excluye `api/index.js` porque es bundle generado desde `server/api/index.ts` para Vercel y ahora falla si las líneas bajan de 60%.

### Infraestructura

- [x] CI/CD con GitHub Actions (lint + test + build)
- [x] Husky pre-push — activo: `pre-commit` → lint-staged, `pre-push` → lint + test + build:web + security-audit
- [x] Lighthouse CI para performance budget (configurado; requiere runner CI para evitar limitación EPERM local de Windows)

### Frontend

- [x] Agregar bridge URL ↔ estado para deep linking básico
- [ ] Evaluar router declarativo solo cuando pase `npm run security-audit`
- [x] Refactor `components/` legacy → eliminar duplicación

> ✅ Cerrado 2026-08-02: `src/components/` contiene 30 archivos; 29 son barrels de compatibilidad protegidos por `src/components/legacyCompatibility.test.ts` y 1 es el test de compatibilidad. Ya no quedan componentes reales en la capa legacy. `MetricCard`, `ErrorBoundary`, `ToastProvider` y `ShortcutsModal` viven en `src/shared/ui/`; `ClosedCases` vive en `src/features/causas/`; `TemplateEditor` vive en `src/features/document-templates/`; `InteractiveTimeline` vive en `src/features/timeline/`; `Header` y sus subcomponentes viven en `src/widgets/header/`; `Sidebar` y `SidebarUserMenu` viven en `src/widgets/sidebar/`.

- [x] Agregar skeletons para todas las vistas lazy

> ✅ Cerrado 2026-08-02: las vistas lazy tienen fallbacks específicos para dashboard, estudiantes, anotaciones, asesor, administración, reportes y plataforma. Los modales lazy críticos usan skeleton modal (`NewCausaModal`, `LoginPage`, `ShortcutsModal`, ficha de expediente, ficha de estudiante, nuevo proceso disciplinario, edición de causa) y el generador de cartas usa un skeleton estructural. `src/app/lazyFallbacks.test.ts` bloquea `fallback={null}` en `src/app` y `src/features`.

- [x] Eliminar fetching remoto con `useEffect` en `StudentsPanel`

> ✅ `StudentsPanel` usa `useCoursesQuery` y `useStudentsWithCoursesQuery`; mantiene filtros locales con reducer y conserva caché aislada por tenant.

- [x] Adoptar `react-hook-form` incrementalmente

> ✅ Cerrado 2026-08-04: `react-hook-form@7.84.0` está instalado. `NewCausaModal`, `EditCausaModalForm` y `LoginPage` usan RHF + Zod con errores inline accesibles y schemas compartidos en `src/shared/lib/schemas/`.

## Mediano Plazo (3-6 meses)

### Arquitectura

- [x] Unificar las rutas compartidas de ambos server entry points
- [ ] Migrar a Edge Functions de Supabase (reemplazar Express)
- [ ] Implementar React Server Components (si aplica)

### Features

- [x] Dashboard analítico avanzado (gráficos, tendencias)

> ✅ **Cerrado base 2026-08-04:** el dashboard muestra KPIs, distribución por gravedad, rankings y tendencias del año escolar vigente (marzo-diciembre) con aperturas/cierres de expedientes y anotaciones agregadas por mes. `TrendChart` se extrajo a `src/shared/ui/charts/` y se reutiliza en `ReportsCenter` para la distribución mensual por gravedad. La lectura de anotaciones usa una consulta tenant-scoped con columnas mínimas (`date_time`, `severity`, `type`) y excluye nombres, RUT, estudiante, docente y texto de observación. Queda como optimización futura mover tendencias históricas a una RPC agregada cuando el volumen real justifique paginación o análisis multi-año.

- [x] Exportación de reportes en Excel — `ReportsCenter` usa `write-excel-file`; `annotationsExcelExport.ts`; importación en `server/api/services/excelImport.ts`
- [x] Notificaciones en tiempo real (Realtime Supabase, opt-in)
- [ ] Modo offline con IndexedDB

### Base de Datos

- [x] Completar migración TEXT → UUID en student_ids

> ✅ Verificado: `inspectorate_records.student_id` ya es `uuid` (baseline línea 1900) y las FKs apuntan a `students(id)`. Los casts `::text` restantes en RPCs son comparaciones legacy, no columnas TEXT.

- [x] Seed data completo para desarrollo local

> ✅ Cerrado 2026-08-02: `supabase/seed.sql` carga datos demo idempotentes para tenant, usuarios Auth/perfiles, membresías, cursos, estudiantes, anotaciones, expedientes, bitácora, checklist, cartas, reglas disciplinarias, plantillas, análisis PDF, historial de estudiante, reportes, notificaciones, invitaciones y configuración/documentos institucionales. `src/shared/lib/seedData.test.ts` bloquea regresiones de cobertura del seed. La CLI actual no tiene subcomando `supabase db seed`; el seed corre con `supabase db reset` según `supabase/config.toml`.

- [x] Agregar índices compuestos faltantes

> ✅ Cerrado 2026-08-03: `supabase/migrations/20260803004959_add_query_pattern_indexes.sql` agrega índices idempotentes para los patrones de lectura frecuentes: cursos/estudiantes ordenados por tenant, deduplicación de RUT en importaciones, anotaciones por fecha/tipo, cartas y eventos por estudiante/carta, historial de etapas, PDFs disciplinarios por hash o estudiante, anotaciones detectadas, documentos/reglamentos institucionales y eventos de salida de cartas. `src/shared/lib/databaseIndexes.test.ts` bloquea regresiones en la migración.

## Largo Plazo (6-12 meses)

### Producto

- [ ] Módulo PIE (Programa de Integración)
- [ ] Módulo UTP (Unidad Técnico Pedagógica)
- [ ] Portal de apoderados (visibilidad de proceso)
- [ ] App mobile (React Native / Expo)

### Técnico

- [ ] SSR con framework (Next.js o similar)
- [ ] PWA con service worker
- [ ] Internacionalización (i18n)
- [ ] Performance budget: <200ms TTI, <90 LH score

## Mejoras Continuas

### Calidad

- [x] ESLint + Biome sin warnings

> ✅ Verificado al 2026-08-02: `npm run lint` (typecheck + eslint) finaliza sin errores ni warnings.

- [x] TypeScript strict sin errors
- [x] Tests pasando en CI
- [ ] Auditorías de seguridad periódicas

> 🟡 **En progreso:** `docs/reviews/security-review.md` registra quick wins corregidos (incluye P-01: privacyMode en rankings del dashboard).

### UX

- [ ] WCAG 2.1 AA certificado
- [x] Gate axe básico en CI
- [x] Skeleton loading en todas las vistas
- [ ] Animaciones de transición fluidas
- [ ] Feedback visual en todas las acciones
