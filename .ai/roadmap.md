# Roadmap — Sistema Integral de Convivencia Escolar

## Inmediato

### Supabase Compartido — Fase 0 ✅ Cerrada

- [x] 20260726000001: current_tenant_id(), tablas, policies, Storage
- [x] 20260726000003: REVOKE directo RPCs sensibles (correctiva DO block)
- [x] 20260726000002: search_path SECURITY DEFINER
- [x] 20260726000004: REVOKE ACL directas anon/authenticated (correctiva)

### Supabase Compartido — Fase 0.5b ✅ Cerrada

- [x] Bloque 1: Storage signed URLs — `getPublicUrl()` → `createSignedUrl()` en Inasistencias
- [x] Bloque 2: Eliminar `tenant_id` hardcodeado en `inspectorateService.ts`
- [x] Bloque 3: Migraciones `20260727000001` a `20260727000004` aplicadas manualmente
- [x] Bloque 4: Vista Docente en modo mantenimiento (RPC no encontrado → empty + banner)
- [x] Bloque 5: Tests pasando (120/120 Inasistencias, 136/136 Convivencia)
- [x] Bloque 6: Trigger canónico único, profiles nullable, tenant defaults, documents RLS tenant-aware

### Supabase Compartido — Fase 1 ✅ Cerrada

- [x] Reconciliación canónica del esquema remoto compartido
- [x] Inventario de tablas, funciones y Storage
- [x] Adoption ledger, baseline, migration reconciliation
- [x] Code consumption matrix
- [x] Arquitectura applications/app_memberships preparada
- [x] 6 borradores de migraciones Fase 2

### Supabase Compartido — Fase 2 ✅ Cerrada (reconciliada)

- [x] 9 migraciones escritas, aplicadas y reconciliadas (00001-00009)
- [x] 00009 correctiva: revoke_applications_default_privileges
- [x] Backfill: teacher → inasistencias ✅, staff excluido ⚠️
- [x] RLS: tenants, applications, app_memberships — least-privilege verificado
- [x] Helpers: current_user_memberships(), has_app_access() — SECURITY DEFINER
- [x] Validaciones SQL pre/post + has_table_privilege
- [x] Feature flag VITE_APP_MEMBERSHIPS_ENABLED=false
- [x] Smoke tests: Convivencia flag=false ✅, Inasistencias flag=false ✅, Inasistencias flag=true ✅
- [x] Migraciones aplicadas en Supabase remoto y reconciliadas con locales

### Supabase Compartido — Fase 3 ✅ Completada

- [x] 3 modos de autenticación: legacy, transition, enforced
- [x] Config helpers: getMembershipAuthMode(), APP_ROLE_RULES, env validation
- [x] Membership service: retry, cache, timeout, mode-aware
- [x] Auth store: membershipLoaded, legacyFallbackUsed, applicationCode
- [x] UI components: MembershipLoading, MembershipAccessDenied, MembershipFallbackWarning
- [x] Server middleware: 3 modes con fallback en transition
- [x] Convivencia: App.tsx con membership gate
- [x] Inasistencias: useAuth + App.tsx con membership gate
- [x] Validación: Convivencia 136/136 + Inasistencias 120/120
- [x] Docs: staff membership decision, phase 3 report
- [ ] Enforcement: profiles.role sigue como fallback (pendiente staff membership)

## Corto Plazo (1-3 meses)

### Testing

- [ ] Unificar runners de test (vitest sobre tsx --test)
- [ ] Tests para stores (authStore, causasStore, uiStore)
- [ ] Tests para hooks (useCausasPersistence, useTimelineController)
- [ ] Tests E2E con Playwright para flujo crítico: login → causas → timeline
- [ ] Alcanzar > 30% cobertura

### Infraestructura

- [ ] CI/CD con GitHub Actions
- [ ] Lighthouse CI para performance budget
- [ ] Husky pre-push (configurado, verificar funcionamiento)

### Frontend

- [x] Caché React Query de causas y detalles aislada por tenant, con actualización selectiva tras mutaciones
- [ ] React Router para deep linking (navegación por URL)
- [ ] Refactor de `components/` legacy → eliminar duplicación
- [ ] Skeleton loading para todas las vistas lazy

## Mediano Plazo (3-6 meses)

### Arquitectura

- [x] Unificar rutas de los server entry points (`server/api/routes/` canónico)
- [ ] Migrar a Edge Functions de Supabase (reemplazar Express)
- [ ] Implementar React Server Components (si aplica)

### Features

- [ ] Dashboard analítico con gráficos y tendencias
- [ ] Exportación de reportes en Excel
- [ ] Notificaciones en tiempo real (Realtime Supabase)
- [ ] Modo offline con IndexedDB

### Base de Datos

- [ ] Completar migración TEXT → UUID en inspectorate_records.student_id
- [ ] Seed data completo para desarrollo local
- [ ] Agregar índices compuestos faltantes

## Largo Plazo (6-12 meses)

### Producto

- [ ] Módulo PIE (Programa de Integración Escolar)
- [ ] Módulo UTP (Unidad Técnico Pedagógica)
- [ ] Portal de apoderados (visibilidad del proceso)
- [ ] App mobile (React Native / Expo)

### Técnico

- [ ] SSR con framework moderno (Next.js o similar)
- [ ] PWA con service worker
- [ ] Internacionalización (i18n)
- [ ] Performance budget: < 200ms TTI, > 90 Lighthouse score

## Mejoras Continuas

### Calidad

- [ ] ESLint + Biome sin warnings
- [ ] TypeScript strict sin errores
- [ ] Tests automáticos en CI
- [ ] Auditorías de seguridad periódicas

### UX

- [ ] WCAG 2.1 AA certificado
- [ ] Animaciones de transición fluidas
- [ ] Feedback visual en todas las acciones del usuario
- [ ] Onboarding mejorado para nuevos usuarios

## Decisiones Pendientes

| Tema                  | Propuesta                       | Estado         |
| --------------------- | ------------------------------- | -------------- |
| React Router          | Reemplazar state-driven routing | Pendiente      |
| Unificar test runners | Vitest sobre tsx --test         | Prioridad alta |
| Edge Functions        | Reemplazar Express              | En evaluación  |
| Plantillas dinámicas  | Editor de plantillas en la UI   | Futuro         |
