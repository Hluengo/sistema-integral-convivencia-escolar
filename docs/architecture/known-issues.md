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

- **No React Router**: Estado de navegación no persiste en URL, no hay deep linking
- **Dual entry points**: Se mantienen por entorno, pero comparten las mismas rutas canónicas
- **Legacy `components/`**: cerrado como deuda de duplicación; 30 archivos actuales, 29 barrels de compatibilidad y 1 test, sin componentes reales en esa capa
- **Circular chunks**: Warnings en build por manualChunks

### Testing

- **Cobertura global**: medición activa con `npm run test:coverage`; umbral mínimo 60% líneas y estado verificado 85.61% al 2026-08-02.

### Database

- **Seed local**: cerrado; `supabase/seed.sql` carga datos demo idempotentes para desarrollo local.
- **Bucket legacy**: `documentos_convivencia` creado externamente (no en migraciones)

### Frontend

- **No React Router**: Routing state-driven limita UX
- **Sin SSR/SSG**: Toda la app es CSR
- **Sin PWA**: No hay service worker ni offline support

## Observaciones

- El chunk circular warning es conocido y no afecta runtime
- La deuda técnica en `components/` está inventariada; `legacyCompatibility.test.ts` protege los barrels y evita reintroducir duplicación en `MetricCard`, `ErrorBoundary`, `ToastProvider`, `ShortcutsModal`, `Header`, `Sidebar` y sus subcomponentes.
- Los dos entry points siguen siendo necesarios; ya no duplican implementaciones de rutas
- La migración de TEXT a UUID en student_ids está cerrada para `inspectorate_records.student_id`; queda monitorear casts legacy en RPCs.
