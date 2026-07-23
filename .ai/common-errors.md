# Common Errors & Solutions

## Build & Deploy

| Error | Causa | Solución |
|-------|-------|----------|
| `Vercel 500 on PDF upload` | pdf.worker.mjs no incluido | ✅ Fixed: vercel.json includeFiles |
| `CSP blocks fonts` | Google Fonts no en CSP | Agregar fonts.googleapis.com a style-src y fonts.gstatic.com a font-src |
| `opencode.json corruption` | Plugins sobreescriben config | Restaurar desde git: `git checkout HEAD -- opencode.json` |
| `Vite HMR disconnect` | Puerto 3002 ocupado | Verificar con `lsof -i :3002` |
| `Tests fail with module not found` | Dependencias no instaladas | `npm install` primero |

## Authentication

| Error | Causa | Solución |
|-------|-------|----------|
| `JWT verification failed` | Token ES256 (nuevos) vs HS256 (legacy) | HMAC + Supabase API fallback (implementado) |
| `401 on API routes` | Token expirado o inválido | Refresh token automático (Supabase) |
| `CORS error` | Origen no permitido | Verificar VITE_SUPABASE_URL |

## Database

| Error | Causa | Solución |
|-------|-------|----------|
| `RLS policy returns empty` | Usuario no tiene tenant_id en JWT | Verificar trigger sync_tenant_to_jwt |
| `Insert fails on NOT NULL tenant_id` | Faltó tenant_id en el insert | Agregar tenant_id explícitamente |
| `Storage upload 403` | RLS en storage.objects bloquea | Verificar path pattern tenant_id/ |
| `document_templates not found` | Tabla no existe | Ejecutar SQL de creación + seed |

## Frontend

| Error | Causa | Solución |
|-------|-------|----------|
| `Blank screen on load` | Supabase client init sin env vars | Verificar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY |
| `Annotations not saving` | faltó date_time en el insert | Incluir date_time (NOT NULL en BD real) |
| `Cartas not registering` | faltó tenant_id | Agregar tenant_id al insert |

## Testing

| Error | Causa | Solución |
|-------|-------|----------|
| `riceMeasures.test.ts not found` | Archivo no creado | Crear o remover referencia de package.json |
| `Test timeout` | Dependencia externa no disponible | Mockear servicios externos en tests |

## AI

| Error | Causa | Solución |
|-------|-------|----------|
| `429 Too Many Requests` | Rate limit excedido | Esperar 1 minuto (10 req/min/IP) |
| `AI returns unexpected content` | Prompt injection | Usar sanitizeForAI() |
| `AI returns empty` | Token limit excedido (2000) | Acortar input o aumentar max_tokens |
