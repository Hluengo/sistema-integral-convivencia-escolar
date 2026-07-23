# Roadmap — Sistema Integral de Convivencia Escolar

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
- [ ] React Router para deep linking (navegación por URL)
- [ ] Refactor de `components/` legacy → eliminar duplicación
- [ ] Skeleton loading para todas las vistas lazy

## Mediano Plazo (3-6 meses)

### Arquitectura
- [ ] Unificar server entry points (server/routes/ + server/api/routes/)
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

| Tema | Propuesta | Estado |
|------|-----------|--------|
| React Router | Reemplazar state-driven routing | Pendiente |
| Unificar test runners | Vitest sobre tsx --test | Prioridad alta |
| Edge Functions | Reemplazar Express | En evaluación |
| Plantillas dinámicas | Editor de plantillas en la UI | Futuro |
