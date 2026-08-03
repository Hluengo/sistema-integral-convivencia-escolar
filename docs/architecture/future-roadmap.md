# Future Roadmap

> **Última verificación:** 2026-08-02 | Se contrastó cada ítem contra el código y la base de datos reales.

## Corto Plazo (1-3 meses)

### Testing

- [x] Unificar tests unitarios en Node Test Runner
- [x] Agregar cobertura base faltante de stores/hooks vigentes
- [x] E2E tests con Playwright para flujos críticos (`tests/*.spec.ts`)
- [x] Alcanzar >60% cobertura — **85.61% líneas / 85.59% ramas / 84.74% funciones** al 2026-08-02

> ✅ `authStore`, `uiStore`, `toastStore` y selectores/acciones síncronas de `causasStore` tienen cobertura base desde el 2026-08-02; hooks críticos (`causaPersistence`, `useNotifications`) ya estaban cubiertos. `gearStore` y `riceMeasures` fueron reconciliados como referencias documentales obsoletas: no existen símbolos vigentes en `src/`. `npm run test:coverage` excluye `api/index.js` porque es bundle generado desde `server/api/index.ts` para Vercel y ahora falla si las líneas bajan de 60%.

### Infraestructura

- [x] CI/CD con GitHub Actions (lint + test + build)
- [x] Husky pre-push — activo: `pre-commit` → lint-staged, `pre-push` → lint + test + build:web + security-audit
- [x] Lighthouse CI para performance budget (configurado; requiere runner CI para evitar limitación EPERM local de Windows)

### Frontend

- [ ] Integrar React Router para deep linking
- [x] Refactor `components/` legacy → eliminar duplicación

> ✅ Cerrado 2026-08-02: `src/components/` contiene 30 archivos; 29 son barrels de compatibilidad protegidos por `src/components/legacyCompatibility.test.ts` y 1 es el test de compatibilidad. Ya no quedan componentes reales en la capa legacy. `MetricCard`, `ErrorBoundary`, `ToastProvider` y `ShortcutsModal` viven en `src/shared/ui/`; `ClosedCases` vive en `src/features/causas/`; `TemplateEditor` vive en `src/features/document-templates/`; `InteractiveTimeline` vive en `src/features/timeline/`; `Header` y sus subcomponentes viven en `src/widgets/header/`; `Sidebar` y `SidebarUserMenu` viven en `src/widgets/sidebar/`.

- [x] Agregar skeletons para todas las vistas lazy

> ✅ Cerrado 2026-08-02: las vistas lazy tienen fallbacks específicos para dashboard, estudiantes, anotaciones, asesor, administración, reportes y plataforma. Los modales lazy críticos usan skeleton modal (`NewCausaModal`, `LoginPage`, `ShortcutsModal`, ficha de expediente, ficha de estudiante, nuevo proceso disciplinario, edición de causa) y el generador de cartas usa un skeleton estructural. `src/app/lazyFallbacks.test.ts` bloquea `fallback={null}` en `src/app` y `src/features`.

- [x] Eliminar fetching remoto con `useEffect` en `StudentsPanel`

> ✅ `StudentsPanel` usa `useCoursesQuery` y `useStudentsWithCoursesQuery`; mantiene filtros locales con reducer y conserva caché aislada por tenant.

## Mediano Plazo (3-6 meses)

### Arquitectura

- [x] Unificar las rutas compartidas de ambos server entry points
- [ ] Migrar a Edge Functions de Supabase (reemplazar Express)
- [ ] Implementar React Server Components (si aplica)

### Features

- [ ] Dashboard analítico avanzado (gráficos, tendencias)

> 🟡 **Parcial:** el dashboard ya muestra KPIs, distribución por gravedad y rankings. Faltan gráficos históricos y tendencias.

- [x] Exportación de reportes en Excel — `ReportsCenter` usa `write-excel-file`; `annotationsExcelExport.ts`; importación en `server/api/services/excelImport.ts`
- [x] Notificaciones en tiempo real (Realtime Supabase, opt-in)
- [ ] Modo offline con IndexedDB

### Base de Datos

- [x] Completar migración TEXT → UUID en student_ids

> ✅ Verificado: `inspectorate_records.student_id` ya es `uuid` (baseline línea 1900) y las FKs apuntan a `students(id)`. Los casts `::text` restantes en RPCs son comparaciones legacy, no columnas TEXT.

- [x] Seed data completo para desarrollo local

> ✅ Cerrado 2026-08-02: `supabase/seed.sql` carga datos demo idempotentes para tenant, usuarios Auth/perfiles, membresías, cursos, estudiantes, anotaciones, expedientes, bitácora, checklist, cartas, reglas disciplinarias, plantillas, análisis PDF, historial de estudiante, reportes, notificaciones, invitaciones y configuración/documentos institucionales. `src/shared/lib/seedData.test.ts` bloquea regresiones de cobertura del seed. La CLI actual no tiene subcomando `supabase db seed`; el seed corre con `supabase db reset` según `supabase/config.toml`.

- [ ] Agregar índices compuestos faltantes

> 🟡 **En progreso:** ya existen varios compuestos clave (`audit_events_tenant_occurred_at_idx`, `idx_inspectorate_student_date`, `idx_app_memberships_tenant_user_active`, `idx_bitacora_causa_fecha`). Pendiente auditar el resto según queries frecuentes.

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
- [x] Skeleton loading en todas las vistas
- [ ] Animaciones de transición fluidas
- [ ] Feedback visual en todas las acciones
