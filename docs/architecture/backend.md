# Backend Architecture

## Dual Entry Points

| Entry | Archivo | Uso | Bundle |
|-------|---------|-----|--------|
| Dev Server | `server/index.ts` | Desarrollo local | tsx runtime |
| Vercel Handler | `server/api/index.ts` → `api/index.js` | Producción | esbuild ESM |

**Regla crítica**: Al modificar rutas, middleware o lógica, actualizar AMBOS.

## API Endpoints

| Método | Ruta | Auth | AI | Propósito |
|--------|------|------|----|-----------|
| POST | `/api/advisor-chat` | ✅ | ✅ | Chat asesoría legal AI |
| POST | `/api/audit-due-process` | ✅ | ✅ | Auditoría de debido proceso |
| POST | `/api/draft-document` | ✅ | ✅ | Draft de documento legal |
| POST | `/api/improve-text` | ✅ | ✅ | Mejora de texto institucional |
| POST | `/api/parse-annotations` | ❌ | ❌ | Parseo de anotaciones (regex) |
| POST | `/api/process-disciplinary-pdf` | ✅ | ❌ | Análisis de PDF disciplinario |
| POST | `/api/process-disciplinary-pdf/confirm` | ✅ | ❌ | Confirmación de proceso |
| GET | `/api/document-templates` | ❌ | ❌ | Obtener plantillas |
| PUT | `/api/document-templates` | ✅ | ❌ | Actualizar plantilla |
| POST | `/api/usage/events` | ✅ | ❌ | Registrar evento de uso |
| GET | `/api/usage/stats` | ✅ | ❌ | Estadísticas de uso |
| GET | `/api/auth-debug` | ❌ | ❌ | Debug JWT |

## Auth Middleware

El middleware `requireAuth` implementa verificación JWT en dos etapas:

1. **HMAC-SHA256** (primario): Rápido, sin HTTP calls
2. **Supabase API** (fallback): Para tokens ES256

Inyecta `req.user` con payload decodificado y `req.tenantId` del contexto.

## AI Integration

- **Proveedor**: OpenRouter (env: `OPENROUTER_API_KEY`)
- **Modelo**: `meta-llama/llama-3.1-8b-instruct`
- **Temperatura**: 0 (determinista)
- **Max tokens**: 2000
- **Rate limit**: 10 req/min/IP por endpoint
- **Cache**: advisor-chat e improve-text (5min TTL, in-memory)

## Middleware Stack

```
express.json()
compression()
RateLimiter (por IP, 10 req/min)
Route handlers
  ├── requireAuth (JWT verification)
  └── Route-specific logic
Error handler
```

## Dependencias Servidor

- `express` 4.21 — Framework HTTP
- `@supabase/supabase-js` 2.110 — Supabase client (service role)
- `pdfjs-dist` 6.1.200 — PDF text extraction
- `compression` — Gzip middleware
- `dotenv` — Environment variables
- Node built-ins: crypto, https, path, url
