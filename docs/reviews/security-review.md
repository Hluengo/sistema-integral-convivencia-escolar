# Security Review — Sistema Integral de Convivencia Escolar

> **Fecha:** 2026-07-23 | **Auditor:** Staff Engineer | **Versión:** 2.0
> **Alcance:** Código fuente, configuración de infraestructura, dependencias, migraciones SQL
> **Método:** Revisión manual de código + análisis estático + revisión de dependencias

---

## Resumen Ejecutivo

| Severidad | Count | Acción |
|-----------|-------|--------|
| CRITICAL | 0 | ✅ Sin hallazgos críticos |
| HIGH | 5 | Requiere corrección en este sprint |
| MEDIUM | 8 | Planificar para próximo sprint |
| LOW | 5 | Backlog |
| INFORMATIONAL | 7 | Monitorear |

---

## FALSE_POSITIVE (Anteriormente CRITICAL)

### FP-01: Migración 202607251100 — índice correcto, sin duplicados

**Ubicación:** `supabase/migrations/202607251100_fix_disciplinary_rules_and_derivation.sql:57-68`
**Estado:** `FALSE_POSITIVE` — La exploración automática reportó erróneamente columnas duplicadas al truncar la salida.

**Verificación:** Lectura directa del archivo confirma 6 columnas distintas, cada una una vez:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_disciplinary_rules_unique_threshold
  ON disciplinary_rules (
    tenant_id,
    rule_type,
    suggested_letter_type,
    COALESCE(min_negativas, -1),     -- ← columna 1 ✓
    COALESCE(max_negativas, -1),     -- ← columna 2 ✓
    COALESCE(min_positivas, -1),     -- ← columna 3 ✓
    COALESCE(max_positivas, -1),     -- ← columna 4 ✓
    COALESCE(min_informativas, -1),  -- ← columna 5 ✓
    COALESCE(max_informativas, -1)   -- ← columna 6 ✓
  );
```

El `ROW_NUMBER() OVER (PARTITION BY ...)` en la misma migración (líneas 34-47) usa exactamente las mismas 6 columnas en el mismo orden. El índice es consistente con la lógica de deduplicación.

**Conclusión:** No hay typo, no hay duplicados, no hay bloqueo de migración. No requiere acción.

---

## HIGH

### H-01: Sin CORS configurado en servidor Express

**Ubicación:** `server/api/index.ts:9-11`, `server/index.ts:17-19`
**Evidencia:** Ningún archivo importa o configura `cors`. `app.use(cors())` no aparece en ningún entry point. El proyecto depende del CORS por defecto de Vercel (permisivo).
**Impacto:** Cualquier origen puede hacer peticiones a la API en desarrollo local. En Vercel, aunque la plataforma bloquea por defecto orígenes no coincidentes, no hay control explícito sobre qué orígenes están permitidos.
**Probabilidad:** ALTA — el CORS permisivo de Vercel por defecto permite `*` para respuestas simples.
**Recomendación:** Agregar `cors` middleware con lista blanca de orígenes:
```ts
import cors from 'cors';
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://sistema-integral-convivencia-escolar.vercel.app',
];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
```
**Esfuerzo:** 15 minutos
**Prioridad:** ALTA
**Corregible localmente:** Sí
**Requiere cambio remoto:** No

### H-02: Ruta `/api/auth-debug` sin autenticación

**Ubicación:** `server/api/routes/debug.ts` (importado en `server/api/index.ts`)
**Evidencia:** La ruta `debugRoutes` se monta sin `requireAuth`. Devuelve información de diagnóstico del token JWT incluyendo: subject, email, role, expiración, algoritmo HMAC usado, y la longitud del `SUPABASE_JWT_SECRET`.
**Impacto:** Cualquier persona con el URL de la API puede: (1) verificar la longitud del JWT secret, (2) probar tokens arbitrarios, (3) obtener información sobre la configuración de autenticación. Esto facilita ataques de fuerza bruta contra JWT.
**Probabilidad:** MEDIA — requiere conocer la URL exacta del endpoint.
**Recomendación:** Agregar `requireAuth` middleware a la ruta debug, o limitarla a IPs internas:
```ts
router.get('/auth-debug', requireAuth, handler);
```
**Esfuerzo:** 5 minutos
**Prioridad:** ALTA
**Corregible localmente:** Sí

### H-03: Ruta `GET /api/document-templates` sin autenticación

**Ubicación:** `server/api/routes/templates.ts`
**Evidencia:** El GET de templates se monta sin `requireAuth`. Expone los templates de documentos del sistema (plantillas DOCX, prompts de IA, etc.).
**Impacto:** Cualquier persona puede leer las plantillas de documentos, incluyendo prompts del sistema con instrucciones de IA que podrían revelar lógica interna del negocio.
**Probabilidad:** ALTA — endpoint público.
**Recomendación:** Agregar `requireAuth` al GET de templates, o al menos rate limiting:
```ts
router.get('/', requireAuth, getTemplates);
```
**Esfuerzo:** 5 minutos
**Prioridad:** ALTA
**Corregible localmente:** Sí

### H-04: `authStore` memory leak — subscription a `onAuthStateChange` sin cleanup

**Ubicación:** `src/shared/lib/stores/authStore.ts:26-30`
**Evidencia:**
```ts
export const useAuthStore = create<AuthState>((set) => {
  const timeoutId = setTimeout(() => { set({ authLoading: false }); }, AUTH_TIMEOUT_MS);
  subscribeAuth(async (_event, session) => {
    clearTimeout(timeoutId);
    ...
  });
  return { ... };
});
```
La función `subscribeAuth` (de `auth.service.ts`) registra un callback en `supabase.auth.onAuthStateChange()` pero el store nunca devuelve una función de cleanup para desuscribirse. Cada recreación del store (hot reload en desarrollo) registra un nuevo listener sin eliminar el anterior.
**Impacto:** Acumulación de listeners en desarrollo. En producción, el listener persiste por toda la vida de la SPA, pero si el store se recrea (p.ej., error boundary recovery), se duplica.
**Probabilidad:** BAJA en producción, ALTA en desarrollo (hot reload).
**Recomendación:** Agregar return de cleanup en el store:
```ts
const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
return () => subscription?.unsubscribe();
```
**Esfuerzo:** 10 minutos
**Prioridad:** ALTA
**Corregible localmente:** Sí

### H-05: `injectTenantContext` es best-effort y silencioso

**Ubicación:** `server/middleware/auth.ts:88-120`, `server/api/middleware/auth.ts` (equivalente)
**Evidencia:** `injectTenantContext` captura todos los errores silenciosamente (`catch { // Tenant context is best-effort }`). Si falla (timeout, network error, perfil no encontrado), el request continúa sin `tenantId`. El código downstream que usa `req.tenantId` para filtrar datos multi-tenant tendría `undefined`.
**Impacto:** Potencial exposición de datos entre tenants si el middleware falla y una ruta downstream no verifica que `tenantId` exista.
**Probabilidad:** BAJA — el endpoint de profiles rara vez falla (timeout 3s, 3 intentos).
**Recomendación:** Al menos loggear el error: `console.error('[tenant] Failed to inject tenant context:', err)`. Considerar retornar 500 si el tenant no se puede resolver.
**Esfuerzo:** 10 minutos
**Prioridad:** ALTA
**Corregible localmente:** Sí
**Requiere cambio remoto:** No

---

## MEDIUM

### M-01: Rate limiter sin límite de tamaño en Map

**Ubicación:** `server/lib/rateLimit.ts:6`, `server/api/services/rateLimit.ts:6`
**Evidencia:** `const rateLimitMap = new Map<string, { count: number; resetAt: number }>();` — crece sin límite. Un atacante con IPs variadas (o IPv6 /64) puede llenar la memoria.
**Impacto:** Potencial OOM si hay muchas IPs únicas (10+ requests cada una).
**Probabilidad:** BAJA (requiere ~100k IPs distintas).
**Recomendación:** Agregar poda periódica o límite de entradas:
```ts
if (rateLimitMap.size > 10000) {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}
```
**Esfuerzo:** 10 minutos
**Prioridad:** MEDIA
**Corregible localmente:** Sí

### M-02: CSP con `'unsafe-inline'` y `'unsafe-eval'`

**Ubicación:** `vercel.json:39`
**Evidencia:**
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
```
**Impacto:** Permite ejecución de scripts inline arbitrarios. Si hay un XSS, no hay defensa por CSP.
**Probabilidad:** BAJA (React escapa por defecto), pero si hay algún `dangerouslySetInnerHTML` (revisar MarkdownRenderer), el CSP no protege.
**Recomendación:** Evaluar si `'unsafe-eval'` puede eliminarse (React 19 no lo requiere en producción). `'unsafe-inline'` es necesario para bundles Vite.
**Esfuerzo:** 1 hora (requiere prueba de build con CSP estricto)
**Prioridad:** MEDIA
**Corregible localmente:** Sí

### M-03: No hay `trust proxy` configurado

**Ubicación:** `server/index.ts`, `server/api/index.ts`
**Evidencia:** `app.set('trust proxy', ...)` nunca se llama. Express usa `req.ip` directamente de la conexión TCP.
**Impacto:** El rate limiter usa `req.ip`. Detrás de un proxy inverso (Vercel, Nginx), todas las conexiones parecen venir de la IP del proxy, no del cliente real. El rate limiting se aplica globalmente, no por cliente.
**Probabilidad:** ALTA en Vercel (siempre detrás de proxy).
**Recomendación:** Agregar `app.set('trust proxy', 1)` en ambos entry points.
**Esfuerzo:** 5 minutos
**Prioridad:** MEDIA
**Corregible localmente:** Sí

### M-04: JWT fast-path desactivado — `current_tenant_id()` sin JWT claim

**Ubicación:** `supabase/migrations/20260720003_anotaciones_storage.sql:4-9`
**Evidencia:** La migración `20260720003` revierte `current_tenant_id()` a la versión simple sin JWT fast-path que `20260717002` había agregado.
**Impacto:** Cada llamada a RLS (en cada query) hace un SELECT a `profiles`, agregando latencia a todas las queries multi-tenant.
**Probabilidad:** 100% — afecta todas las queries.
**Recomendación:** Restaurar el fast-path JWT de `20260717002` en una nueva migración.
**Esfuerzo:** 30 minutos (requiere nueva migración + test)
**Prioridad:** MEDIA
**Corregible localmente:** Sí (archivo de migración)
**Requiere cambio remoto:** Sí (aplicar migración)

### M-05: `express.json({ limit: '512kb' })` — límite alto para requests de API

**Ubicación:** `server/api/index.ts:12`, `server/index.ts:20`
**Evidencia:** 512KB es el límite máximo del body JSON. Las requests de chat AI o mejora de texto no deberían exceder 100KB.
**Impacto:** Un atacante puede enviar payloads grandes (512KB) que requieren procesamiento y memoria en el servidor.
**Probabilidad:** BAJA.
**Recomendación:** Reducir a 100KB para endpoints generales y 1MB solo para PDF upload.
**Esfuerzo:** 10 minutos
**Prioridad:** MEDIA
**Corregible localmente:** Sí

### M-06: Sentry DSN expuesto en frontend público

**Ubicación:** `.env.example:24` (no es código), `src/` (referencia a Sentry)
**Evidencia:** `VITE_SENTRY_DSN` es una variable VITE (prefijo `VITE_`) que se incluye en el bundle del frontend. El DSN de Sentry es semi-público (no es secreto), pero permite enviar eventos falsos.
**Impacto:** Un atacante podría enviar eventos falsos a Sentry, generando ruido en error tracking.
**Probabilidad:** BAJA.
**Recomendación:** Agregar rate limiting en Sentry para el DSN público. Usar un DSN separado para frontend (público) y backend (privado).
**Esfuerzo:** 30 minutos
**Prioridad:** MEDIA
**Corregible localmente:** Parcial (configuración en Sentry dashboard)

### M-07: Rate limiter usa fixed window, no sliding window

**Ubicación:** `server/lib/rateLimit.ts`, `server/api/services/rateLimit.ts`
**Evidencia:** El rate counter se resetea en `now + RATE_WINDOW` (timestamp fijo). Una ráfaga de 10 requests al inicio del window agota el límite por 60s.
**Impacto:** Un atacante puede hacer 10 requests en 1 segundo y el sistema no responde por 59 segundos (para ese IP). Pero también, usuarios legítimos quedan bloqueados.
**Probabilidad:** BAJA.
**Recomendación:** Implementar sliding window log o token bucket con refill rate.
**Esfuerzo:** 1 hora
**Prioridad:** MEDIA
**Corregible localmente:** Sí

### M-08: No hay headers de rate limit en respuestas

**Ubicación:** `server/lib/rateLimit.ts` y rutas que lo usan
**Evidencia:** `checkRateLimit` retorna `boolean`, pero la ruta solo responde `429 Too Many Requests`. Nunca se envían `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.
**Impacto:** El cliente no sabe cuándo puede reintentar ni cuántos requests le quedan.
**Probabilidad:** BAJA.
**Recomendación:** Retornar headers informativos desde `checkRateLimit`.
**Esfuerzo:** 30 minutos
**Prioridad:** MEDIA
**Corregible localmente:** Sí

---

## LOW

### L-01: Falta `compression` en `server/api/index.ts`

**Ubicación:** `server/api/index.ts`
**Evidencia:** `server/index.ts` usa `compression()` pero `server/api/index.ts` no.
**Impacto:** API respuestas sin compresión gzip/brotli en Vercel (aunque Vercel puede comprimir a nivel de plataforma).
**Probabilidad:** BAJA (Vercel comprime en edge).
**Recomendación:** Agregar `app.use(compression())` en `server/api/index.ts`.
**Esfuerzo:** 5 minutos
**Prioridad:** BAJA
**Corregible localmente:** Sí

### L-02: No hay tests de RLS

**Ubicación:** Ningún archivo de test
**Evidencia:** No existen tests que verifiquen que un usuario de un tenant no pueda acceder a datos de otro tenant.
**Impacto:** Regresiones en RLS pueden pasar desapercibidas.
**Probabilidad:** BAJA.
**Recomendación:** Agregar tests de integración con service role que prueben aislamiento multi-tenant.
**Esfuerzo:** 4 horas
**Prioridad:** BAJA

### L-03: No hay `database.types.ts` generado

**Ubicación:** No existe en `src/lib/` ni `src/shared/`
**Evidencia:** La búsqueda no encontró ningún archivo `database.types.ts`.
**Impacto:** Las queries Supabase no tienen tipado fuerte. Errores en nombres de columnas o tablas solo se detectan en runtime.
**Probabilidad:** MEDIA (errores tipográficos).
**Recomendación:** Generar tipos: `supabase gen types typescript --linked > src/lib/database.types.ts`
**Esfuerzo:** 15 minutos + integración continua
**Prioridad:** BAJA

### L-04: Service role key expuesta en variable de entorno del MCP de Supabase

**Ubicación:** `opencode.json:27`
**Evidencia:**
```json
"supabase": {
  "env": {
    "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
    ...
  }
}
```
**Impacto:** Si el MCP server de Supabase es comprometido, un atacante podría usar el service role.
**Probabilidad:** MUY BAJA (el MCP es local).
**Recomendación:** Es aceptable localmente. En CI/CD, considerar usar un token con menos privilegios.
**Esfuerzo:** N/A
**Prioridad:** BAJA

### L-05: Ruta `parse-annotations` sin autenticación (pero rate-limited)

**Ubicación:** `server/api/routes/parse.ts`
**Evidencia:** No usa `requireAuth`, pero sí `checkRateLimit`. Solo retorna conteos agregados (sin datos personales).
**Impacto:** Bajo — la ruta solo expone metadatos agregados.
**Probabilidad:** BAJA.
**Recomendación:** Agregar autenticación para consistencia, o documentar por qué está abierta.
**Esfuerzo:** 5 minutos
**Prioridad:** BAJA

---

## INFORMATIONAL

### I-01: 22 migraciones — historial creciente, mantener disciplina
**Recomendación:** Nunca modificar migraciones existentes. Siempre crear nuevas.

### I-02: 11 variables de entorno — documentar cada una en README
**Recomendación:** Agregar tabla en README con propósito, origen y si es requerida.

### I-03: npm audit reporta 11 vulnerabilidades (8 high, 3 moderate)
**Recomendación:** Revisar si afectan al proyecto. Ejecutar `npm audit --omit=dev`.

### I-04: Sin Supabase Edge Functions — toda la lógica está en Express/Vercel
**Nota:** Beneficioso para simplicidad. Monitorear si el serverless timeout (30s) es suficiente para PDF processing.

### I-05: PostHog analytics configurado — revisar que no exponga datos de NNA
**Recomendación:** Verificar que PostHog no capture PII ni datos de estudiantes.

### I-06: Privacy mode implementado en UI — buena práctica
**Nota:** Ocultar datos de NNA en interfaz. Verificar que se aplique consistentemente en todas las vistas.

### I-07: Sin HTTPS redirección explícita — Vercel la maneja por defecto
**Nota:** En producción, Vercel redirige HTTP→HTTPS automáticamente.

---

## Quick Wins Corregidos

| ID | Cambio | Archivo | Riesgo |
|----|--------|---------|--------|
| H-02 | Agregar `requireAuth` a `/api/auth-debug` | `server/api/routes/debug.ts` | Ninguno — es un endpoint solo de diagnóstico |
| H-03 | Agregar `requireAuth` a `GET /api/document-templates` | `server/api/routes/templates.ts` | Bajo — los templates no requieren acceso público |
| M-01 | Límite de 10000 entradas en rate limiter Map | `server/lib/rateLimit.ts`, `server/api/services/rateLimit.ts` | Ninguno — solo memory safety |
| M-03 | Agregar `trust proxy` en ambos entry points | `server/index.ts`, `server/api/index.ts` | Bajo — necesario para rate limiting correcto detrás de proxy |
| L-01 | Agregar `compression` en `server/api/index.ts` | `server/api/index.ts` | Muy bajo — solo performance |
| M-05 | Reducir body limit a 100KB (500KB para PDF) | `server/index.ts`, `server/api/index.ts` | Bajo — verificar que ninguna request exceda 100KB |

---

## Resumen de Acciones

| Prioridad | Acción | Archivos | Esfuerzo |
|-----------|--------|----------|----------|
| 🔴 CRITICAL | Corregir typo en índice duplicado en migración | `supabase/migrations/202607251100_fix_disciplinary_rules_and_derivation.sql` | 5 min |
| 🟠 HIGH | Agregar CORS middleware | `server/api/index.ts`, `server/index.ts` | 15 min |
| 🟠 HIGH | Proteger `/api/auth-debug` con auth | `server/api/routes/debug.ts` | 5 min |
| 🟠 HIGH | Proteger `GET /api/document-templates` con auth | `server/api/routes/templates.ts` | 5 min |
| 🟠 HIGH | Limpiar subscription de authStore | `src/shared/lib/stores/authStore.ts` | 10 min |
| 🟠 HIGH | Agregar logging en `injectTenantContext` | `server/middleware/auth.ts` | 10 min |
| 🟡 MEDIUM | Agregar `trust proxy` | `server/index.ts`, `server/api/index.ts` | 5 min |
| 🟡 MEDIUM | Limitar rate limiter Map | `server/lib/rateLimit.ts`, `server/api/services/rateLimit.ts` | 10 min |
| 🟡 MEDIUM | Reducir body limit | `server/index.ts`, `server/api/index.ts` | 10 min |
| 🟢 LOW | Agregar compression en API entry | `server/api/index.ts` | 5 min |
| ⚪ INFO | Generar database.types.ts | `src/lib/database.types.ts` | 15 min |
