# Informe de Cambios — Auditoría y Plan de 4 Puntos

**Fecha:** 30 de julio de 2026
**Contexto:** Correcciones derivadas de auditoría integral de seguridad, deuda técnica y arquitectura.

---

## Resumen

Se ejecutó un plan de 4 puntos para eliminar código muerto, consolidar la arquitectura backend, agregar redes de seguridad (error handler, validación UUID) y aplicar rate limit compartido vía middleware Express.

## Validación

| Comando             | Resultado                                                                             |
| ------------------- | ------------------------------------------------------------------------------------- |
| `typecheck`         | ✅ **0 errores** (resuelto `npm install` para `write-excel-file`)                     |
| `npm test`          | ✅ **253 tests, 253 pasan**                                                           |
| `lint:code`         | ✅ **0 errores** (limpiado `CausasTable.tsx` y archivos propios)                      |
| `git diff --check`  | ✅ Sin errores de whitespace (solo warnings CRLF Windows)                             |
| `build:web`         | ✅ **Build exitoso**                                                                  |
| `security-audit`    | ⚠️ Bloqueado por configuración npm local (`--allow-scripts` requerido)                |
| **Vercel deploy**   | ✅ **READY** (`state: success`) — https://sistema-integral-convivencia-escolar-gctihiheo.vercel.app |

---

## Punto 1 — Consolidación de Backend

### Problema

Código duplicado en `server/routes/` (10 archivos) mientras `server/api/routes/` contenía los mismos endpoints activos. `server/lib/` tenía 3 re-exports muertos.

### Cambios

| Archivo                                          | Acción                                               |
| ------------------------------------------------ | ---------------------------------------------------- |
| `server/routes/` (10 archivos + tests)           | **Eliminado** — código muerto                        |
| `server/lib/rateLimit.ts`, `cache.ts`, `groq.ts` | **Eliminados** — re-exports muertos                  |
| `server/lib/__tests__/rateLimit.test.ts`         | **Movido** a `server/api/services/rateLimit.test.ts` |
| `server/api/routes/pilot.ts`                     | **Nuevo** — migrado desde `server/routes/pilot.ts`   |
| `server/api/routes/__tests__/pilot.test.ts`      | **Nuevo** — migrado                                  |
| `server/api/middleware/requireTenant.ts`         | Re-export desde `../../middleware/`                  |
| `server/api/middleware/requireRole.ts`           | Re-export desde `../../middleware/`                  |
| `server/api/types.ts`                            | Re-export desde `../types.js`                        |
| `server/index.ts`, `server/api/index.ts`         | Import pilot actualizado                             |
| `server/lib/__tests__/jwks.test.ts`              | Restaurado desde git tras eliminación accidental     |

---

## Punto 2 — Middleware Global de Errores Express

### Problema

Cada ruta repetía `try/catch`. Si una ruta olvidaba el catch, errores internos retornaban HTML sin cuerpo JSON.

### Archivos

| Archivo                                                        | Acción                                       |
| -------------------------------------------------------------- | -------------------------------------------- |
| `server/middleware/errorHandler.ts`                            | **Nuevo** — middleware 4-param               |
| `server/index.ts`, `server/api/index.ts`                       | `app.use(errorHandler)` tras todas las rutas |
| `server/middleware/__tests__/errorHandler.test.ts`             | **Nuevo** — 6 tests unitarios                |
| `server/middleware/__tests__/errorHandler.integration.test.ts` | **Nuevo** — 3 tests de integración           |

### Comportamiento

| Tipo de error                   | Status | Respuesta                                  |
| ------------------------------- | ------ | ------------------------------------------ |
| `RequestValidationError`        | 400    | `{ error: err.message }`                   |
| `SyntaxError` (JSON malformado) | 400    | `{ error: 'JSON malformado...' }`          |
| Error desconocido (production)  | 500    | `{ error: 'Error interno del servidor.' }` |
| Error desconocido (development) | 500    | `{ error: err.message }`                   |

---

## Punto 3 — Validación UUID en Templates

### Problema

`PUT /api/document-templates` aceptaba cualquier string como `id`, permitiendo potencial inyección en la consulta a Supabase.

### Cambios

| Archivo                                         | Cambio                                                     |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `server/api/routes/templates.ts`                | `isValidUuid(id)` antes de usar `id` en la URL de Supabase |
| `server/api/routes/__tests__/templates.test.ts` | **Nuevo** — 2 tests                                        |

---

## Punto 4 — Middleware Compartido de Rate Limit

### Problema

Cada ruta de AI (advisor, audit, improve, etc.) debía implementar su propio rate limit manualmente. No había un middleware reutilizable. En producción serverless sin Redis, el rate limit en memoria es inútil pero no se advertía claramente.

### Solución implementada

Middleware Express reutilizable que se aplica a las 6 rutas de AI y análisis:

**Middleware (`server/middleware/rateLimit.ts`):**

- Clave = `req.user?.sub` (usuario autenticado) con fallback a `req.ip`
- Usa `checkRateLimitAsync()` que intenta Redis (Upstash), fallback a memoria
- Retorna `429 { error, retryAfter }` si se excede el límite

**Límite:** 10 solicitudes por minuto por usuario/IP

### Archivos

| Archivo                                         | Acción                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `server/middleware/rateLimit.ts`                | **Nuevo** — middleware Express reutilizable                                          |
| `server/index.ts`                               | `rateLimit` aplicado a audit, draft, improve, advisor, parse, processDisciplinaryPdf |
| `server/api/index.ts`                           | `rateLimit` aplicado a las mismas 6 rutas                                            |
| `server/middleware/__tests__/rateLimit.test.ts` | **Nuevo** — 5 tests (allow, block, user key, IP fallback)                            |

### Rutas con rate limit

| Ruta                                 | Middleware  |
| ------------------------------------ | ----------- |
| `POST /api/audit-due-process`        | `rateLimit` |
| `POST /api/draft-document`           | `rateLimit` |
| `POST /api/improve-text`             | `rateLimit` |
| `POST /api/advisor-chat`             | `rateLimit` |
| `POST /api/parse-annotations`        | `rateLimit` |
| `POST /api/process-disciplinary-pdf` | `rateLimit` |

Rutas **sin** rate limit: `templates`, `debug`, `usage`, `pilot`.

### Variables Upstash (ya documentadas en `.env.example`)

```
# === Rate Limiting Persistente (opcional, para producción en Vercel) ===
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

En producción, si no están configuradas, se emite `console.warn` estructurado y se usa memoria como fallback (con advertencia de que es inútil en serverless).

---

## Estadísticas de Tests

| Suite                                               | Tests  | Resultado       |
| --------------------------------------------------- | ------ | --------------- |
| `errorHandler.test.ts` (unitario)                   | 6      | ✅              |
| `errorHandler.integration.test.ts`                  | 3      | ✅              |
| `rateLimit.test.ts` (middleware)                    | 5      | ✅              |
| `rateLimit.test.ts` (service)                       | 7      | ✅              |
| `pilot.test.ts`                                     | 5      | ✅              |
| `templates.test.ts`                                 | 2      | ✅              |
| Tests pre-existentes (auth, jwks, validators, etc.) | 225    | ✅              |
| **Total**                                           | **253**| **✅ 253 pasan** |

---

## Archivos Creados (6 nuevos + 2 migrados)

```
server/
├── middleware/
│   ├── errorHandler.ts                     (nuevo)
│   ├── rateLimit.ts                        (nuevo)
│   └── __tests__/
│       ├── errorHandler.test.ts            (nuevo)
│       ├── errorHandler.integration.test.ts (nuevo)
│       └── rateLimit.test.ts               (nuevo)
├── api/
│   ├── routes/
│   │   ├── pilot.ts                        (migrado)
│   │   └── __tests__/
│   │       ├── pilot.test.ts               (migrado)
│   │       └── templates.test.ts           (nuevo)
│   └── services/
│       └── rateLimit.test.ts               (migrado)
```

## Archivos Eliminados (14)

```
server/routes/              (10 archivos + tests)
server/lib/cache.ts
server/lib/groq.ts
server/lib/rateLimit.ts
server/lib/__tests__/rateLimit.test.ts
```

## Archivos Modificados (10)

```
server/index.ts
server/api/index.ts
server/api/middleware/requireTenant.ts
server/api/middleware/requireRole.ts
server/api/types.ts
server/api/routes/templates.ts
server/api/services/rateLimit.ts
.env.example                         (ya documentado)
informe-cambios.md                   (este archivo)
```

---

_Fin del informe._
