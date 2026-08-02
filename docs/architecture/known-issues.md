# Known Issues & Technical Debt

## Active Issues

| Issue                                          | Severidad | Estado      | Detalle                                                                                 |
| ---------------------------------------------- | --------- | ----------- | --------------------------------------------------------------------------------------- |
| Vercel 500 en PDF upload                       | Alta      | ✅ Fixed    | Worker pdfjs-dist no incluido. Solución: includeFiles en vercel.json                    |
| JWT ES256 verification                         | Media     | ⚡ Mitigado | HMAC + API fallback implementado                                                        |
| CSP bloquea fonts                              | Baja      | ⚡ Mitigado | Google Fonts añadido a CSP                                                              |
| `components/` legacy duplicado                 | Media     | ⚡ Mitigado | 17 barrels protegidos por test; quedan componentes reales por mover gradualmente        |
| Dual server routes                             | Alta      | ✅ Resuelto | Una implementación canónica en `server/api/routes/`, compartida por desarrollo y Vercel |
| `inspectorate_records.student_id` TEXT vs UUID | Media     | ✅ Resuelto | Verificado como UUID con FK a `students(id)`; los casts `::text` restantes son legacy   |

## Technical Debt

### Arquitectura

- **No React Router**: Estado de navegación no persiste en URL, no hay deep linking
- **Dual entry points**: Se mantienen por entorno, pero comparten las mismas rutas canónicas
- **Legacy `components/`**: 27 archivos actuales; 17 son barrels de compatibilidad y el resto son componentes reales pendientes de migración gradual
- **Circular chunks**: Warnings en build por manualChunks

### Testing

- **Cobertura incompleta**: Los flujos principales tienen pruebas unitarias y E2E, pero falta medir cobertura global

### Database

- **Sin seed data**: `supabase/seed.sql` está vacío
- **Bucket legacy**: `documentos_convivencia` creado externamente (no en migraciones)

### Frontend

- **No React Router**: Routing state-driven limita UX
- **Sin SSR/SSG**: Toda la app es CSR
- **Sin PWA**: No hay service worker ni offline support

## Observaciones

- El chunk circular warning es conocido y no afecta runtime
- La deuda técnica en `components/` está inventariada; `legacyCompatibility.test.ts` protege los barrels y evita reintroducir duplicación en `MetricCard`, `ErrorBoundary`, `ToastProvider`, `Sidebar` y `SidebarUserMenu`.
- Los dos entry points siguen siendo necesarios; ya no duplican implementaciones de rutas
- La migración de TEXT a UUID en student_ids está cerrada para `inspectorate_records.student_id`; queda monitorear casts legacy en RPCs.
