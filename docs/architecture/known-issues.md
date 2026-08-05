# Known Issues & Technical Debt

## Active Issues

| Issue                                          | Severidad | Estado      | Detalle                                                                                 |
| ---------------------------------------------- | --------- | ----------- | --------------------------------------------------------------------------------------- |
| Vercel 500 en PDF upload                       | Alta      | ✅ Fixed    | Worker pdfjs-dist no incluido. Solución: includeFiles en vercel.json                    |
| JWT ES256 verification                         | Media     | ⚡ Mitigado | HMAC + API fallback implementado                                                        |
| CSP bloquea fonts                              | Baja      | ⚡ Mitigado | Google Fonts añadido a CSP                                                              |
| `components/` legacy duplicado                 | Media     | ⚡ Mitigado | 26 barrels protegidos por test; quedan 3 componentes reales por mover gradualmente      |
| Dual server routes                             | Alta      | ✅ Resuelto | Una implementación canónica en `server/api/routes/`, compartida por desarrollo y Vercel |
| `inspectorate_records.student_id` TEXT vs UUID | Media     | ✅ Resuelto | Verificado como UUID con FK a `students(id)`; los casts `::text` restantes son legacy   |

## Technical Debt

### Arquitectura

- **Routing declarativo pendiente**: El bridge `History API` ya permite URL y deep linking básico; `MainContent` mantiene renderizado condicional mientras no exista router compatible con el gate de seguridad.
- **Dual entry points**: Se mantienen por entorno, pero comparten las mismas rutas canónicas
- **Legacy `components/`**: cerrado como deuda de duplicación; 30 archivos actuales, 29 barrels de compatibilidad y 1 test, sin componentes reales en esa capa
- **Circular chunks**: Warnings en build por manualChunks

### Testing

- **Cobertura global**: medición activa con `npm run test:coverage`; umbral mínimo 60% líneas y estado verificado 85.66% al 2026-08-03.

### Database

- **Seed local**: cerrado; `supabase/seed.sql` carga datos demo idempotentes para desarrollo local.
- **Índices compuestos**: cerrado para los patrones actuales; `20260803004959_add_query_pattern_indexes.sql` cubre lecturas tenant-scoped frecuentes y queda pendiente medir uso real cuando Supabase Inspect vuelva a estar disponible.
- **Bucket legacy**: `documentos_convivencia` creado externamente (no en migraciones)

### Frontend

- **Routing declarativo pendiente**: Falta migrar los condicionales de `MainContent` a rutas declarativas y agregar E2E autenticado para `/expedientes/:causaId`.
- **WCAG 2.1 AA certificado pendiente**: existe gate automatizado básico con `npm run test:a11y` para dashboard público y login, pero falta auditoría manual completa y ampliar cobertura a tablas densas/modales secundarios.
- **Sin SSR/SSG**: Toda la app es CSR
- **Sin PWA**: No hay service worker ni offline support

## Observaciones

- El chunk circular warning es conocido y no afecta runtime
- La deuda técnica en `components/` está inventariada; `legacyCompatibility.test.ts` protege los barrels y evita reintroducir duplicación en `MetricCard`, `ErrorBoundary`, `ToastProvider`, `ShortcutsModal`, `Header`, `Sidebar` y sus subcomponentes.
- Los dos entry points siguen siendo necesarios; ya no duplican implementaciones de rutas
- La migración de TEXT a UUID en student_ids está cerrada para `inspectorate_records.student_id`; queda monitorear casts legacy en RPCs.
