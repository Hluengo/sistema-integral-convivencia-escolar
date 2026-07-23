# Future Roadmap

## Corto Plazo (1-3 meses)

### Testing
- [ ] Migrar tests unitarios a Vitest (unificar runners)
- [ ] Agregar tests faltantes (`riceMeasures`, stores, hooks)
- [ ] E2E tests con Playwright para flujos críticos
- [ ] Alcanzar >30% cobertura

### Infraestructura
- [ ] CI/CD con GitHub Actions (lint + test + build)
- [ ] Husky pre-push (ya configurado)
- [ ] Lighthouse CI para performance budget

### Frontend
- [ ] Integrar React Router para deep linking
- [ ] Refactor `components/` legacy → eliminar duplicación
- [ ] Agregar skeletons para todas las vistas lazy

## Mediano Plazo (3-6 meses)

### Arquitectura
- [ ] Unificar server entry points (eliminar dual routes)
- [ ] Migrar a Edge Functions de Supabase (reemplazar Express)
- [ ] Implementar React Server Components (si aplica)

### Features
- [ ] Dashboard analítico avanzado (gráficos, tendencias)
- [ ] Exportación de reportes en Excel
- [ ] Notificaciones en tiempo real (Realtime Supabase)
- [ ] Modo offline con IndexedDB

### Base de Datos
- [ ] Completar migración TEXT → UUID en student_ids
- [ ] Seed data completo para desarrollo local
- [ ] Agregar índices compuestos faltantes

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
- [ ] ESLint + Biome sin warnings
- [ ] TypeScript strict sin errors
- [ ] Tests pasando en CI
- [ ] Auditorías de seguridad periódicas

### UX
- [ ] WCAG 2.1 AA certificado
- [ ] Skeleton loading en todas las vistas
- [ ] Animaciones de transición fluidas
- [ ] Feedback visual en todas las acciones
