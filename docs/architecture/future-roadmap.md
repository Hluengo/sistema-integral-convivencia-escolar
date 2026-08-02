# Future Roadmap

> **Última verificación:** 2026-08-02 | Se contrastó cada ítem contra el código y la base de datos reales.

## Corto Plazo (1-3 meses)

### Testing

- [x] Unificar tests unitarios en Node Test Runner
- [x] Agregar cobertura base faltante de stores/hooks vigentes
- [x] E2E tests con Playwright para flujos críticos (`tests/*.spec.ts`)
- [x] Alcanzar >30% cobertura — **55.89% líneas / 74.16% statements** al 2026-08-02

> ✅ `authStore`, `uiStore`, `toastStore` y selectores/acciones síncronas de `causasStore` tienen cobertura base desde el 2026-08-02; hooks críticos (`causaPersistence`, `useNotifications`) ya estaban cubiertos. `gearStore` y `riceMeasures` fueron reconciliados como referencias documentales obsoletas: no existen símbolos vigentes en `src/`. Meta siguiente: >60% líneas.

### Infraestructura

- [x] CI/CD con GitHub Actions (lint + test + build)
- [x] Husky pre-push — activo: `pre-commit` → lint-staged, `pre-push` → lint + test + build:web + security-audit
- [x] Lighthouse CI para performance budget (configurado; requiere runner CI para evitar limitación EPERM local de Windows)

### Frontend

- [ ] Integrar React Router para deep linking
- [ ] Refactor `components/` legacy → eliminar duplicación

> 🟡 **En progreso:** se consolidaron capas legacy y se colapsaron barrels hacia `shared` (`191b9c4`); se eliminó código muerto/duplicado (`b466eb4`). Resta auditar componentes huérfanos en `components/`.
> ✅ Auditoría 2026-08-02: `src/components/` contiene 27 archivos; 17 son barrels de compatibilidad protegidos por `src/components/legacyCompatibility.test.ts`. `MetricCard`, `ErrorBoundary` y `ToastProvider` se movieron a `src/shared/ui/`; `Sidebar` y `SidebarUserMenu` se movieron a `src/widgets/sidebar/`. Sus archivos en `src/components/` quedaron como re-export. Próximo paso recomendado: migrar `ShortcutsModal` a `shared/ui` y separar `Header` subcomponents hacia `src/widgets/header/` para seguir reduciendo `components/`.

- [ ] Agregar skeletons para todas las vistas lazy

> 🟡 **En progreso:** existen fallbacks en `MainContent` (Dashboard/Anotaciones/Students/Advisor), `DashboardStats`, `AnotacionesView`, `StudentsPanel`, `RankingCard`. Falta verificar cobertura completa en todas las rutas lazy.

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

- [ ] Seed data completo para desarrollo local

> 🟡 **Parcial:** solo existe `scripts/seed-templates.sql`.

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
- [ ] Skeleton loading en todas las vistas
- [ ] Animaciones de transición fluidas
- [ ] Feedback visual en todas las acciones
