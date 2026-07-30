# Known Issues & Technical Debt

## Active Issues

| Issue                                          | Severidad | Estado      | Detalle                                                                                 |
| ---------------------------------------------- | --------- | ----------- | --------------------------------------------------------------------------------------- |
| Vercel 500 en PDF upload                       | Alta      | ✅ Fixed    | Worker pdfjs-dist no incluido. Solución: includeFiles en vercel.json                    |
| JWT ES256 verification                         | Media     | ⚡ Mitigado | HMAC + API fallback implementado                                                        |
| CSP bloquea fonts                              | Baja      | ⚡ Mitigado | Google Fonts añadido a CSP                                                              |
| `components/` legacy duplicado                 | Media     | ❌ Abierto  | Barrel re-exports en features/ + components/                                            |
| Dual server routes                             | Alta      | ✅ Resuelto | Una implementación canónica en `server/api/routes/`, compartida por desarrollo y Vercel |
| `inspectorate_records.student_id` TEXT vs UUID | Media     | ❌ Abierto  | Migración incompleta de TEXT a UUID                                                     |

## Technical Debt

### Arquitectura

- **No React Router**: Estado de navegación no persiste en URL, no hay deep linking
- **Dual entry points**: Se mantienen por entorno, pero comparten las mismas rutas canónicas
- **Legacy `components/`**: 50+ archivos duplicados con barrels
- **Circular chunks**: Warnings en build por manualChunks

### Testing

- **Cobertura incompleta**: Los flujos principales tienen pruebas unitarias y E2E, pero falta medir cobertura global

### Database

- **TEXT vs UUID**: `inspectorate_records.student_id` es TEXT pero references UUID PK
- **Sin seed data**: `supabase/seed.sql` está vacío
- **Bucket legacy**: `documentos_convivencia` creado externamente (no en migraciones)

### Frontend

- **No React Router**: Routing state-driven limita UX
- **Sin SSR/SSG**: Toda la app es CSR
- **Sin PWA**: No hay service worker ni offline support

## Observaciones

- El chunk circular warning es conocido y no afecta runtime
- La deuda técnica en `components/` es manejable gracias a barrels
- Los dos entry points siguen siendo necesarios; ya no duplican implementaciones de rutas
- La migración de TEXT a UUID en student_ids es progresiva
