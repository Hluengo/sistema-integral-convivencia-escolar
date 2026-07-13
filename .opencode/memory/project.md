# Memoria del Proyecto — Debido Proceso

## Decisiones Arquitectónicas

### Dual Server Entry Points
- `server.ts` — Dev server (Express + Vite middleware)
- `api/index.js` — Vercel serverless function
- Razón: Vercel no soporta Express en serverless; dev necesita HMR

### JWT Verification Strategy
- HMAC (HS256) first — rápido, sin llamadas HTTP
- Supabase API fallback — para tokens ES256 (migración ~5 meses)
- Razón: Performance + compatibilidad con rotación de keys

### AI Model Selection
- Groq API como proveedor principal (llama-3.3-70b-versatile)
- Selector inteligente por tipo de tarea
- Razón: Costo-efectivo, buenas capacidades en español

### Supabase Proyecto Principal
- `jjzwwhnofiepvliugowr` — "Registro Inasistencia"
- PostgreSQL 17.6.1, region us-west-2
- Razón: Proyecto principal con todos los datos

## Patrones de Código

### API Responses
```json
{ "ok": true, "data": {...} }
{ "ok": false, "error": "mensaje" }
```

### Error Handling
```typescript
try { ... }
catch (e) { console.error('[contexto]', e); }
```

### Auth Check
```typescript
const user = await getSupabaseUser(req);
if (!user) return res.status(401).json({ ok: false, error: 'No autenticado' });
```

## Convenciones

- Todo en español chileno
- License headers: `/** @license SPDX-License-Identifier: Apache-2.0 */`
- Path alias `@/` → project root
- Snake_case en DB, camelCase en TypeScript
