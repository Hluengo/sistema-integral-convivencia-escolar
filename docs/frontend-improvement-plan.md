# Plan de Mejora Frontend

> **Autor:** Frontend Architect
> **Fecha:** 2026-08-04
> **Estado:** Fases 1, 2, 3.1, 4.1, 4.2, 4.3 y gate inicial de Fase 5 implementados — quedan ruta declarativa, E2E autenticado de deep link y auditorías continuas
> **Alcance:** `src/` (frontend React 19 + TypeScript + Tailwind v4 + Zustand 5 + React Query 5)

---

## 1. Resumen ejecutivo

El frontend tiene bases sólidas: estructura FSD correcta, lazy loading con skeletons en todas las vistas, Zustand separado por dominio, React Query sin `useEffect` para fetching, cero `any`, accesibilidad respetable (skip link, focus-visible, reduced-motion, forced-colors) y modo privacidad implementado.

Sin embargo, se detectaron **9 brechas** que afectan privacidad, rendimiento, mantenibilidad y experiencia de navegación:

1. **Session Replay de Sentry activo** — ✅ cerrado 2026-08-04; Sentry ya no configura Replay y usa `@sentry/browser`.
2. Telemetría diferida, pero con imports estáticos internos que mantienen chunks pesados de Sentry/PostHog — ✅ cerrado 2026-08-04; Web Vitals recibe adaptadores desde `loadTelemetry()`.
3. **Google Fonts duplicado/render-blocking** vía `@import` en CSS y `<link>` en `index.html` — ✅ cerrado 2026-08-04; se mantiene solo `<link>` en `index.html`.
4. **`App.tsx` monolítico** — ✅ cerrado 2026-08-04; queda como coordinador de 261 líneas con hooks de workspace, routing, navegación, permisos, bienvenida y modal.
5. **Prop drilling > 2 niveles** — ✅ cerrado 2026-08-04; `MainContentProps` queda en 6 props agrupadas y `CausasViewProps` en 3 view-models.
6. **Bitácora/checklist sin atomicidad server-side** — ✅ cerrado 2026-08-04; `saveBitacora` y `saveChecklist` delegan el delta a RPCs transaccionales.
7. **`react-hook-form` no estaba instalado ni usado** — ✅ cerrado 2026-08-04; `NewCausaModal`, `EditCausaModalForm` y `LoginPage` usan RHF + Zod con errores inline.
8. **Routing solo por estado** — ✅ avance 2026-08-04; bridge `History API` ↔ `uiStore` implementado con deep link `/expedientes/:causaId`.
9. Tendencias del dashboard acopladas al JSX (componente ~428 líneas, reutilización limitada) — ✅ cerrado 2026-08-04; `TrendChart`, `MonthlyBars` y `LegendPill` viven en `shared/ui/charts` y se reutilizan en reportes.

El plan se organiza en **5 fases** con prioridad decreciente en riesgo y creciente en esfuerzo. Se recomienda ejecutar en el orden: **Fase 1 → Fase 2 → Fase 4.1 → Fase 3 → resto**, regenerando métricas de bundle/tests antes de cerrar cada fase.

---

## 2. Hallazgos con evidencia

| #   | Hallazgo                                                                                      | Impacto                                                                                     | Evidencia                                                                                                            |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Session Replay de Sentry activo (`replaysOnErrorSampleRate: 1.0`, `replaysSessionSampleRate`) | ✅ Cerrado: Replay removido; se mantiene error tracking/tracing sin captura visual de DOM   | `src/lib/sentry.ts`, `src/lib/telemetry.test.ts`                                                                     |
| 2   | Telemetría ya está diferida, pero `webVitals` importa Sentry/PostHog de forma estática        | ✅ Cerrado: `webVitals` no importa Sentry/PostHog; recibe adaptadores ya cargados           | `src/lib/telemetry.ts`, `src/lib/webVitals.ts`, `src/lib/telemetry.test.ts`                                          |
| 3   | Google Fonts cargado por CSS `@import` y también por `<link>`                                 | ✅ Cerrado: CSS ya no importa Google Fonts; `index.html` centraliza Inter + JetBrains Mono  | `src/index.css`, `index.html`, `src/lib/telemetry.test.ts`                                                           |
| 4   | `App.tsx` orquestaba auth, sync de queries→store, filtrado, modales y atajos                  | ✅ Cerrado: responsabilidades extraídas a hooks/componentes de `src/app/`                   | `src/app/App.tsx` (261 líneas), `src/app/hooks/`                                                                     |
| 5   | `privacyMode`, `selectedFaseFilter`, `searchQuery` viajaban por props entre vistas            | ✅ Cerrado: filtros/privacidad se leen desde Zustand y las props se agrupan por view-models | `src/features/causas/MainContent.tsx`, `CausasView.tsx`, `viewContracts.ts`                                          |
| 6   | `saveBitacora` / `saveChecklist` hacían upsert + cleanup por separado                         | ✅ Cerrado: RPCs `save_bitacora_snapshot` / `save_checklist_snapshot` guardan el delta      | `src/shared/api/services/*.service.ts`, `supabase/migrations/20260804234139_atomic_causa_related_snapshots.sql`      |
| 7   | `react-hook-form` no estaba en dependencies y no había usos de `useForm`                      | ✅ Cerrado: formularios principales usan RHF + Zod y la dependencia pasa `security-audit`   | `package.json`, `src/shared/lib/hooks/useNewCausaForm.ts`, `src/shared/lib/schemas/*Form.ts`                         |
| 8   | `currentView: SidebarView` era el único router                                                | ✅ Avance: la URL sincroniza `uiStore`, login y selección de expediente                     | `src/app/routing.ts`, `src/app/hooks/useUrlRouting.ts`, `tests/navigation.spec.ts`                                   |
| 9   | `DashboardTrendsPanel` de ~428 líneas con gráficos acoplados al JSX                           | ✅ Cerrado: gráficos compartidos reutilizados por Dashboard y Centro de reportes            | `src/shared/ui/charts/`, `src/features/dashboard/DashboardTrendsPanel.tsx`, `src/features/reports/ReportsCenter.tsx` |

---

## 3. Fase 1 — Quick wins: privacidad y bundle (1-2 días)

**Estado 2026-08-04:** implementada. La decisión de formularios se resolvió en Fase 4.2 adoptando `react-hook-form` incrementalmente.

### 3.1 Desactivar Session Replay de Sentry — CRÍTICO

**Problema:** El Session Replay graba el DOM completo (nombres de estudiantes, RUT, anotaciones, cartas) y lo envía a Sentry. Esto es inaceptable para datos de NNA incluso con `privacyMode`, porque el modo privacidad solo enmascara la renderización, no lo que el replay captura si se desactiva.

**Cambio:**

- `src/lib/sentry.ts`: eliminar `replaysOnErrorSampleRate` y `replaysSessionSampleRate` del `Sentry.init`.
- Si se necesita debugging visual futuro: habilitarlo solo por flag explícita y con `maskAllText: true` + `maskAllInputs: true`.

**Impacto esperado:** reducir el chunk `telemetry-sentry` y eliminar captura visual de DOM con datos sensibles.

**Criterio de aceptación:**

- Regenerar `npm run build:web` y registrar tamaño real de `dist/assets/telemetry-sentry-*.js`.
- Confirmar que `replaysOnErrorSampleRate` y `replaysSessionSampleRate` no existan en el bundle.
- Revisar en DevTools Network que no existan requests a `ingest.sentry.io` con payload de replay (`/envelope` con `replay`).

### 3.2 Afinar lazy-init de telemetría

**Estado actual:** `src/lib/telemetry.ts` ya carga Sentry/PostHog con `import()` dinámico y `requestIdleCallback`; `src/app/main.tsx` además difiere la inicialización 2s.

**Cambio:**

- Mantener `loadTelemetry()` como punto único de carga.
- Evitar imports estáticos de `@sentry/react` y `./posthog` en `src/lib/webVitals.ts`; pasar adaptadores desde `loadTelemetry()` o mover la lógica de Web Vitals al callback que ya recibe módulos cargados.
- Verificar que `AuthAnalytics` y `PerformanceProfiler` no disparen telemetría antes de `initializeTelemetry()` salvo eventos estrictamente necesarios.

**Criterio de aceptación:** los chunks `telemetry-*` no aparecen en el bundle inicial (`npm run build:web` + inspección de `dist/index.html`).

**Resultado 2026-08-04:** `dist/index.html` no referencia chunks `telemetry-*`; `telemetry-vitals` queda como chunk diferido pequeño (~6 KB raw).

### 3.3 Fuentes self-host o `display=swap`

**Opción A (recomendada):** descargar Inter + JetBrains Mono a `src/assets/fonts/` y declararlas con `@font-face` local en `src/index.css` (mantener `--font-sans` y `--font-mono`).

**Opción B:** eliminar los `@import` de `src/index.css` y conservar solo `<link rel="preconnect">` + stylesheet con `display=swap` en `index.html`, agregando también JetBrains Mono si se mantiene como fuente externa.

**Criterio de aceptación:** una sola estrategia de carga de fuentes; LCP no depende de doble round-trip a `fonts.googleapis.com`; ninguna advertencia CSP por fuentes bloqueadas.

**Resultado 2026-08-04:** se eliminó `@import` desde `src/index.css`; `index.html` conserva una única estrategia externa con `display=swap` para Inter y JetBrains Mono.

### 3.4 Resolver decisión `react-hook-form`

- ✅ Decisión 2026-08-04: se adopta `react-hook-form@7.84.0` con validación Zod manual mediante resolver local, sin agregar `@hookform/resolvers`.
- Primer formulario migrado: `NewCausaModal` / `NewCausaForm`.

---

## 4. Fase 2 — Reducir el monolito `App.tsx` y el prop drilling (3-5 días)

**Estado 2026-08-04:** implementada. Se redujo `App.tsx` de ~562 a 261 líneas tras integrar el bridge URL; `MainContentProps` quedó en 6 props (`currentView`, `causaWorkspace`, `createCausa`, `navigation`, `onboardingEnabled`, `coursesCount`) y `CausasViewProps` en 3 view-models (`workspace`, `createCausa`, `navigation`).

### 4.1 Extraer hooks de dominio desde `App.tsx`

| Hook propuesto               | Contenido                                                                                               | Origen en App.tsx |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------- |
| `useCausaWorkspace()`        | Sync `causasQuery` ↔ `causasStore`, detalle de causa, merge con persistencia, `loadError` / `retryLoad` | Líneas ~206-300   |
| `useRoleGates()`             | `effectiveAdminRole`, `canAccessAdmin/Reports/Platform`, `onboardingEnabled`                            | Líneas ~71-103    |
| Selector de `filteredCausas` | Mover el filtrado memoizado a `shared/lib/queries/causasQueryCache.ts` o a un selector de Zustand       | Líneas ~121-139   |

**Criterio de aceptación actualizado:** `App.tsx` pasa de ~562 a <300 líneas; `npm run lint` y `npm run test` verdes.

**Resultado 2026-08-04:** `useCausaWorkspace()` concentra carga, hidratación, detalle, persistencia y filtrado; `useRoleGates()` expone la resolución pura `resolveRoleGates()` con tests; `useWelcomeGate()`, `useAppNavigation()`, `useAppShortcuts()` y `useNewCausaModalController()` separan UI shell, atajos y creación de expedientes.

### 4.2 Eliminar prop drilling con selectores de Zustand directos

- `privacyMode` / `setPrivacyMode` → leído desde `useUIStore` en las vistas (`MainContent`, `CausasView`, `StudentsPanel`, `AnotacionesView`).
- `selectedFaseFilter` / `setSelectedFaseFilter` → viven en `causasStore`; `CausasView` los lee directo.
- `searchQuery` / `setSearchQuery` → idem.

**Resultado esperado:** `MainContentProps` de ~20 a ≤6 props (solo composición real: `currentView`, `causas`, `selectedCausaId` y callbacks de negocio).

**Resultado 2026-08-04:** `MainContent` recibe 6 props agrupadas; `CausasView` recibe 3 view-models y lee `privacyMode`, `selectedFaseFilter` y `searchQuery` desde `useUIStore`/`useCausasStore`. Se eliminó el paso de `mobileShowDetail`, `setMobileShowDetail`, `dispatchForm`, filtros y búsqueda hacia `CausasView`.

**⚠️ Precaución:** el contrato de `privacyMode` está documentado en memoria §10.3 (rankings del dashboard con `annotationRankingCardItems.ts`). Al cambiarlo, preservar el comportamiento de enmascarado y actualizar la memoria.

### 4.3 Consolidar vistas huérfanas

- Verificar con knip que `features/dashboard/DashboardStats` y `features/command-palette/CommandPalette` sean los únicos importados y eliminar los barrels restantes de `src/components/` si `legacyCompatibility.test.ts` lo permite.

---

## 5. Fase 3 — Navegación real con deep linking (1-2 semanas)

**Estado 2026-08-04:** Fase 3.1 implementada con bridge propio sobre `window.history`. `useUrlRouting()` sincroniza `window.location` con `uiStore`, `/login` abre el modal de autenticación y `/expedientes/:causaId` selecciona el expediente desde la URL. Se intentó incorporar `react-router-dom`, pero `npm run security-audit` falló por advisory alto en `react-router`; la dependencia fue retirada. Queda pendiente convertir `MainContent` a rutas declarativas solo cuando exista una versión compatible con el gate de seguridad, además de sumar E2E autenticado para `/expedientes/:causaId`.

### 5.1 Routing URL con bridge de `History API`

**Rutas propuestas:**

| Ruta                             | Vista                                      |
| -------------------------------- | ------------------------------------------ |
| `/`                              | Dashboard                                  |
| `/expedientes`                   | CausasView                                 |
| `/expedientes/:causaId`          | CausasView con detalle abierto (deep link) |
| `/anotaciones`                   | AnotacionesView                            |
| `/alumnos`                       | StudentsPanel                              |
| `/informes`                      | AdvisorView                                |
| `/reportes`                      | ReportsCenter                              |
| `/admin`                         | AdminView                                  |
| `/plataforma`                    | PlatformView                               |
| `/nuevo-expediente` o `?nuevo=1` | NewCausaModal                              |
| `/login`                         | LoginPage                                  |

**Estrategia de migración segura:**

1. **Bridge `uiStore` ↔ URL:** `uiStore.currentView` se sincroniza con la URL mediante `window.history` y `popstate` (una sola fuente de verdad: la URL).
2. Reemplazar el condicional de `MainContent` por rutas declarativas cuando exista un router sin advisory alto y con impacto de bundle aceptable.
3. Conservar `handleViewChange` como API interna para Sidebar/Header/CommandPalette, delegando en `navigateToView()` / `navigateToCausa()`.

**Resultado 2026-08-04:** cerrado el punto 1 sin agregar dependencia de routing. `handleViewChange`, selección desde dashboard/notificaciones y cierre de detalle delegan en navegación URL. Los condicionales de `MainContent` se conservan para evitar una reescritura completa de vistas en la misma iteración.

**Criterios de aceptación:**

- Botón atrás del navegador funciona entre vistas.
- Refresh conserva la vista actual.
- El enlace `/expedientes/:causaId` abre el expediente directo.
- Los tests unitarios vigentes siguen verdes (los tests de stores no dependen de la URL).
- E2E nuevo: `tests/navigation.spec.ts` con deep linking.

**Cobertura 2026-08-04:** `src/app/routing.test.ts` cubre mapeo de rutas y deep links; `tests/navigation.spec.ts` cubre `/login` y redirección de ruta desconocida en navegación pública. Falta E2E autenticado para confirmar `/expedientes/:causaId` con datos reales.

### 5.2 Estados de error por vista

- Hoy `loadError` es global en `App.tsx`. Mover a `ErrorBoundary` por vista con `useQueryErrorResetBoundary`: cada vista muestra su propio error + botón "Reintentar" sin tumbar toda la app.

---

## 6. Fase 4 — Integridad de datos y formularios (3-5 días)

### 6.1 Hacer atómica la persistencia de bitácora/checklist — CERRADO

**Estado 2026-08-04:** implementada. `saveBitacora()` y `saveChecklist()` calculan filas cambiadas e IDs removidos, y llaman RPCs `security invoker` (`save_bitacora_snapshot`, `save_checklist_snapshot`) para ejecutar upsert + delete en una única transacción PostgreSQL por colección. Las funciones no aceptan `tenant_id` desde el cliente: resuelven `current_tenant_id()`, validan que la causa sea visible para el tenant y revocan ejecución a `PUBLIC`.

**Problema:** `saveBitacora` y `saveChecklist` ya no borran todo: hacen `upsert` de filas cambiadas y `delete` solo de IDs removidos. Aun así, el snapshot no es atómico; si el cleanup falla después del upsert, o viceversa en una futura refactorización, el expediente puede quedar parcialmente sincronizado.

**Propuesta:**

1. Mantener el enfoque actual de **upsert por entrada** con PK estable.
2. Mantener **borrado por diff** solo para entradas removidas.
3. Agregar **atomicidad server-side** mediante RPC de snapshot (`save_bitacora_snapshot`, `save_checklist_snapshot`) en una transacción PostgreSQL.
4. Crear migración nueva; no modificar migraciones antiguas.

**Criterio de aceptación:**

- ✅ Tests unitarios de servicio: delta de filas cambiadas/removidas y fallo de RPC devuelve `false`.
- ✅ Test estático de migración: `security invoker`, `current_tenant_id()`, `REVOKE FROM PUBLIC` y grants explícitos.
- Pendiente remoto/local DB: aplicar migración y probar rollback real de payload inválido en Supabase.
- `npm run test` y `npm run lint` verdes.

### 6.2 Formularios con react-hook-form + Zod — CERRADO

**Estado 2026-08-04:** implementado. `react-hook-form@7.84.0` está instalado. `useNewCausaForm()` reemplazó el reducer local por `useForm()` con resolver Zod propio. `NewCausaForm`, `EditCausaModalForm` y `LoginPage` muestran errores inline accesibles y usan schemas Zod compartidos (`newCausaFormSchema`, `editCausaFormSchema`, `loginFormSchema`, `passwordResetRequestSchema`, `passwordUpdateFormSchema`).

**Decisión previa:** resuelta a favor de RHF + Zod para mantener la convención actual.

**Orden de migración (incremental):**

1. ✅ `NewCausaModal` / `NewCausaForm`: validación Zod en tiempo real (RUN chileno por formato, curso requerido), errores inline accesibles (`aria-describedby`) y contrato reducido por `UseFormReturn`.
2. ✅ `EditCausaModalForm`: validación Zod de campos editables, RUN, fechas, suspensión, Aula Segura y errores inline.
3. ✅ `LoginPage`: login, recuperación y actualización de contraseña validados con RHF + Zod.

**Criterio de aceptación:** los formularios migrados no pierden funcionalidad. Los schemas `newCausaFormSchema`, `editCausaFormSchema` y `loginFormSchema` quedan cubiertos por tests unitarios; los flujos mantienen selección de curso/estudiante, autocompletado RICE, Aula Segura, edición del expediente y recuperación/actualización de contraseña.

### 6.3 Componentes de gráficos reutilizables

**Estado 2026-08-04:** cerrado. `TrendChart`, `MonthlyBars` y `LegendPill` fueron extraídos a `src/shared/ui/charts/`. `DashboardTrendsPanel` consume esos componentes y `ReportsCenter` reutiliza `TrendChart` para visualizar distribución mensual por gravedad.

**Extensión futura:** reutilizar el mismo contrato (`TrendChartPoint`, `ChartSeriesItem`) en módulos PIE, UTP o portal de apoderados cuando existan tendencias agregadas.

---

## 7. Fase 5 — Calidad y accesibilidad (continuo)

**Estado 2026-08-04:** gate inicial implementado. `@axe-core/playwright` corre con `npm run test:a11y` sobre dashboard público y login; el workflow de CI levanta el servidor Playwright con `PLAYWRIGHT_USE_WEBSERVER=true`. Se corrigieron violaciones detectadas de ARIA y contraste en skeletons, loader y footer de login.

- **WCAG 2.1 AA certificado:** gate axe básico en CI implementado; falta auditoría manual completa, contraste de componentes secundarios y estados hover/focus en tablas densas.
- **Tests de componentes críticos:** `CausasTable` (memo), `TimelineTabs`/`TimelineTabPanels`, `ProcessChecklist`, `CausasView` (filtros) — hoy dominan los tests de utilidades puras; subir cobertura de interacción.
- **Auditoría de re-renders:** con `causasStore` en el árbol, verificar que seleccionar una causa no re-renderice `Sidebar`/`Header` (selectores estrechos ya presentes; medir con React DevTools Profiler antes/después de Fase 2).

---

## 8. Riesgos y límites — lo que NO hay que tocar

- **No** reescribir el Timeline (`src/features/timeline/`) en esta iteración — es el corazón del debido proceso (constitución #17). Solo envolverlo en la navegación de la Fase 3.
- **No** migrar a RHF todos los formularios de golpe — incremental, empezando por los de mayor validación legal.
- **No** modificar `src/lib/queryClient.ts` ni los tiempos de stale sin medir impacto.
- **No** cambiar el contrato de `privacyMode` sin actualizar memoria §10.3 y los tests de rankings.
- **No** eliminar la capa `components/` de una sola vez: los barrels restantes están protegidos por `legacyCompatibility.test.ts`.

---

## 9. Métricas de éxito

| Métrica                           | Hoy                                           | Objetivo                                               |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Chunk telemetría inicial (raw)    | diferido; medir con `npm run build:web`       | sin `telemetry-*` en `dist/index.html`                 |
| Chunks telemetría diferidos (raw) | sentry ~531 KB, posthog ~225 KB, vitals ~6 KB | Sentry sin Replay; PostHog/Sentry aislados y diferidos |
| LCP sin depender de Google Fonts  | `<link>` único con `display=swap`             | ideal self-host futuro                                 |
| Líneas de `App.tsx`               | 261                                           | <300                                                   |
| Props de `MainContent`            | 6                                             | ≤6                                                     |
| `useEffect` para fetching         | 0                                             | 0 (mantener)                                           |
| Tests unitarios                   | medir con `npm run test`                      | no bajar; agregar E2E de deep linking                  |
| Cobertura                         | medir antes de fase                           | no bajar                                               |

---

## 10. Referencias

- [`docs/architecture/frontend.md`](architecture/frontend.md) — árbol de componentes y convenciones
- [`docs/architecture/future-roadmap.md`](architecture/future-roadmap.md) — ítems pendientes (routing declarativo, WCAG AA)
- [`docs/CONSTITUTION.md`](../docs/CONSTITUTION.md) — reglas inmutables (formularios, prop drilling, lazy loading)
- `.opencode/memory/project.md` §10.3 — contrato de `privacyMode`; §12.2 — deuda técnica
