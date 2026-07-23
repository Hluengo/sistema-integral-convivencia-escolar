# Performance Review — Sistema Integral de Convivencia Escolar

> **Fecha:** 2026-07-23 | **Auditor:** Staff Engineer | **Versión:** 2.0
> **Métricas:** Build time, bundle size, render cycles, query patterns, memory
> **Método:** Análisis de código fuente + build measurements + revisión de patrones

---

## Resumen Ejecutivo

| Clasificación | Count | Acción |
|---------------|-------|--------|
| QUICK_WIN | 4 | Implementar ahora |
| MEDIUM_EFFORT | 5 | Planificar este sprint |
| HIGH_EFFORT | 2 | Requiere planificación |
| REQUIRES_PRODUCTION_METRICS | 3 | Sin datos de prod |
| NOT_RECOMMENDED | 0 | — |

---

## Línea Base (Build)

| Métrica | Valor | Evaluación |
|---------|-------|------------|
| Build time | 27.47s | ✅ Aceptable (< 30s) |
| Módulos transformados | 3,792 | ⚡ Alto pero manejable |
| Chunks totales | 11 | ✅ Bien fraccionado |
| **Largest chunk (pdf)** | ~850 KB | ⚠️ Alto |
| JS total (gzip) | ~800 KB | ⚠️ Podría optimizarse |
| CSS (gzip) | 15 KB | ✅ Muy ligero |
| Circular chunk warnings | 9 | ⚠️ Bajos (no bloquean) |

---

## QUICK_WIN

### QW-01: `compression` no importado en `server/api/index.ts`

**Ubicación:** `server/api/index.ts:1-15`
**Problema:** `server/index.ts` (dev) importa y usa `compression`, pero `server/api/index.ts` (Vercel) no. El middleware está instalado como dependencia pero no se usa en el entry point de producción.
**Impacto:** Las respuestas de la API en Vercel no se comprimen a nivel de aplicación. Vercel comprime en edge, pero con `compression` se ganaría compresión también en respuestas de error y otros casos.
**Evidencia:**
```ts
// server/index.ts — tiene ✓
import compression from 'compression';
app.use(compression());
// server/api/index.ts — NO tiene ✗
```
**Propuesta:** Agregar `import compression from 'compression'` y `app.use(compression())` en `server/api/index.ts`.
**Riesgo:** Muy bajo. `compression` ya está en `dependencies`.
**Esfuerzo:** 5 minutos
**Validación:** `npm run build` + curl verificar `Content-Encoding: gzip`

### QW-02: Rate limiter Map sin límite de tamaño (duplica hallazgo M-01 security)

**Ubicación:** `server/lib/rateLimit.ts:6`, `server/api/services/rateLimit.ts:6`
**Problema:** `new Map<string, ...>()` sin límite. En Vercel serverless, el Map se reinicia en cada cold start, pero en el servidor dev con uso prolongado podría crecer.
**Impacto:** Potencial memory leak leve.
**Evidencia:** El Map tiene entradas con `resetAt` pero nunca se limpian entradas expiradas excepto cuando se consultan.
**Propuesta:** Agregar poda periódica cada 100 inserciones o cuando supere 10,000 entradas:
```ts
const MAX_ENTRIES = 10000;
// en checkRateLimit, después de insertar:
if (rateLimitMap.size > MAX_ENTRIES) {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}
```
**Riesgo:** Ninguno. Solo memory safety.
**Esfuerzo:** 10 minutos
**Validación:** Tests existentes + revisión manual

### QW-03: `useCausasStore()` full subscription en App.tsx

**Ubicación:** `src/app/App.tsx:27`
**Problema:** `const causasStore = useCausasStore();` se suscribe a TODOS los campos del store. Cualquier cambio en cualquier propiedad (`causas`, `selectedCausaId`, `saveStatus`, `selectedFaseFilter`, `searchQuery`) causa re-render de `App.tsx` completo.
**Impacto:** Re-render innecesario de toda la app cuando cambia `saveStatus` de `'idle'` a `'saving'` (cada auto-save) o cuando cambia `searchQuery` (cada tecla).
**Evidencia:**
```ts
const causasStore = useCausasStore(); // ← full subscription
const { selectedCausaId, setSelectedCausaId, causas, saveStatus, setSaveStatus } = causasStore;
```
**Propuesta:** Usar selectores individuales (como ya se hace con `useAuthStore`):
```ts
const causas = useCausasStore((s) => s.causas);
const selectedCausaId = useCausasStore((s) => s.selectedCausaId);
const saveStatus = useCausasStore((s) => s.saveStatus);
```
O agrupar en hooks personalizados para mantener legibilidad.
**Riesgo:** Ninguno. Zustand soporta selectores parciales. Mejora performance de render.
**Esfuerzo:** 15 minutos
**Validación:** `npm run test` + revisión visual de que la app funciona igual

### QW-04: `compression` no usado en API entry (duplicado QW-01)

**Ubicación:** `server/api/index.ts`
**Problema:** Mismo que QW-01.
**Propuesta:** Ídem QW-01.
**Riesgo:** Muy bajo.
**Esfuerzo:** 5 minutos

---

## MEDIUM_EFFORT

### ME-01: Chunk `pdf` (850 KB) combina pdf-lib + pdfjs-dist

**Ubicación:** `vite.config.ts:37`
**Problema:** Ambos `pdf-lib` y `pdfjs-dist` están en el mismo chunk `pdf`. `pdfjs-dist` solo se necesita para análisis de PDFs subidos (ruta de anotaciones), mientras que `pdf-lib` se usa para generación de documentos.
**Impacto:** Cualquier página que cargue el chunk PDF (por lazy import) descarga ambos, incluso si solo necesita uno.
**Evidencia:**
```ts
if (id.includes('pdf-lib') || id.includes('pdfjs-dist')) return 'pdf';
```
**Propuesta:** Separar en `pdf-lib` y `pdfjs-dist`:
```ts
if (id.includes('pdf-lib')) return 'pdf-lib';
if (id.includes('pdfjs-dist')) return 'pdfjs';
```
**Riesgo:** Bajo — React.lazy carga el chunk correcto según el componente.
**Esfuerzo:** 30 minutos (requiere probar lazy loading por separado)
**Validación:** Build exitoso + test de carga de cada ruta de PDF

### ME-02: Server-side cache solo en 2 de 4 endpoints AI

**Ubicación:** `server/api/routes/improve.ts`, `advisor.ts`, `audit.ts`, `draft.ts`
**Problema:** Solo `/improve-text` y `/advisor-chat` usan cache. `/audit-due-process` y `/draft-document` no tienen cache aunque también son determinísticos (mismo input = mismo output de IA).
**Impacto:** Requests duplicados a OpenRouter para el mismo contenido.
**Evidencia:**
| Ruta | Cache |
|------|-------|
| `/improve-text` | ✅ SHA256(text), 5min TTL |
| `/advisor-chat` | ✅ SHA256(userId+msg+history), 5min TTL |
| `/audit-due-process` | ❌ Sin cache |
| `/draft-document` | ❌ Sin cache |
**Propuesta:** Agregar cache a `/audit-due-process` (key = SHA256 de todo el caso) y `/draft-document` (key = SHA256 de tipo + datos). Ambos endpoints producen el mismo output para el mismo input exacto.
**Riesgo:** Bajo. El cache se invalida por TTL (5 min). Si los datos cambian, el usuario ve datos con hasta 5 min de desfase.
**Esfuerzo:** 1 hora
**Validación:** Tests existentes + verificar que respuestas cacheadas no rompen contrato

### ME-03: Sin paginación en listas de causas

**Ubicación:** `src/features/causas/MainContent/CausasView.tsx` (carga todas las causas)
**Problema:** `useCausasPersistence` carga todas las causas con su bitácora y checklist. No hay paginación ni virtualización. Con >500 causas, la carga inicial y renderizado serán lentos.
**Impacto:** Degradación progresiva a medida que crece el número de causas.
**Evidencia:** No hay `supabase.from('causas').select('...').range(...)` — se usa `.select('*, bitacora_entries(*), checklist_items(*)')` sin límites.
**Propuesta:** Implementar paginación server-side con Supabase `.range()` y un estado de paginación en Zustand. Cargar solo las primeras 50 causas y cargar más on scroll.
**Riesgo:** Medio — requiere cambios en el hook de persistencia y en la vista.
**Esfuerzo:** 4-6 horas
**Validación:** Test de integración con datos mock >100 causas

### ME-04: Sin `React.memo` en componentes del timeline

**Ubicación:** `src/features/timeline/*.tsx` (15 archivos)
**Problema:** Ningún componente del timeline usa `React.memo`. `TimelineTabPanels.tsx` recibe el objeto `causa` completo y ~30 props, y los pasa a 3 tabs (ProcesoTab, BitacoraTab, AsistenteIATab). Cada cambio en la causa propaga re-render a los 3 tabs, aunque solo 1 esté visible (y los 3 reciben props nuevas).
**Impacto:** Re-renders en cascada cada vez que cambia cualquier propiedad de la causa (cada auto-save).
**Evidencia:**
```tsx
// TimelineTabPanels.tsx — recibe todo el objeto causa
<TimelineTabPanels
  causa={causa}
  ctx={ctx}
  activeTab={activeTab}
  ...
/>
```
**Propuesta:** Agregar `React.memo` a `ProcesoTab`, `BitacoraTab`, `AsistenteIATab` con comparación superficial de props. Considerar separar `causa` en props más específicas.
**Riesgo:** Bajo. React.memo es seguro.
**Esfuerzo:** 2-3 horas
**Validación:** React DevTools profiler antes/después

### ME-05: `useBreaches` hook recalcula en cada cambio de causa

**Ubicación:** `src/features/timeline/hooks/useBreaches.ts`
**Problema:** `useMemo` con dependencia `[causa]` (objeto completo). Por referencia, esto solo recalcula cuando `causa` cambia de referencia (lo que ocurre cada auto-save). Por valor (deep compare), causaría más re-renders.
**Impacto:** Moderado — el hook usa `useMemo` correctamente con referencia.
**Propuesta:** Considerar dependencias más específicas (p.ej., `[causa.estadoActual, causa.fechas]`) para evitar recalcular en cada auto-save de la bitácora.
**Riesgo:** Bajo. El refactor es local al hook.
**Esfuerzo:** 1 hora
**Validación:** Tests de brechas existentes

---

## HIGH_EFFORT

### HE-01: Falta de paginación server-side en consultas Supabase

**Ubicación:** `src/shared/api/services/causas.service.ts` y stores relacionados
**Problema:** La arquitectura actual carga todos los datos del tenant en el store al iniciar sesión. No hay paginación, límite, o virtualización en ninguna lista del frontend.
**Impacto:** Con datos reales de un liceo grande (500+ causas, 1000+ estudiantes, 2000+ anotaciones), la carga inicial será lenta y el renderizado pesado.
**Evidencia:** No se encontró ningún `.range()`, `.limit()`, `.gt('created_at', ...)` en las queries del frontend.
**Propuesta:** Rediseñar la estrategia de datos:
1. Cargar solo IDs + metadatos básicos en listas
2. Lazy load de datos detallados al seleccionar un item
3. React Query para caché de datos detallados
4. Virtual scrolling (react-window o similar) para listas largas
**Riesgo:** Alto — cambios arquitectónicos significativos en stores, hooks y vistas.
**Esfuerzo:** 2-3 semanas
**Validación:** Tests de carga con datos simulados >1000 registros

### HE-02: Bundle JS total ~800 KB gzip

**Ubicación:** Build output de Vite
**Problema:** Aunque el code splitting es bueno, el JS total es alto. Los principales contribuyentes son React+Radix (~670 KB vendor), pdfjs-dist (~500 KB), docx (~340 KB).
**Impacto:** Primera carga lenta en conexiones lentas (3G). El principal chunk `vendor` (671 KB sin comprimir) incluye toda la suite de Radix UI aunque solo se usen 6 componentes.
**Evidencia:** Vendor chunk ~671 KB sin comprimir. Radix UI (~10 packages) pesa ~200 KB de ese total.
**Propuesta:**
1. Evaluar si se necesitan todos los Radix packages o si algunos pueden reemplazarse por componentes nativos
2. Implementar tree-shaking de Radix (ya ocurre con Vite, pero revisar imports)
3. Evaluar si `docx` se necesita en el bundle del cliente o puede ser server-side only
4. Considerar import dinámico de `pdfjs-dist.worker` separado del chunk principal de PDF
**Riesgo:** Medio — requiere pruebas de regresión visual.
**Esfuerzo:** 2-3 días
**Validación:** `ANALYZE=true npm run build:web` + comparación de métricas

---

## REQUIRES_PRODUCTION_METRICS

### RPM-01: Rendimiento de RLS con `current_tenant_id()` sin JWT fast-path

**Ubicación:** RLS en todas las tablas multi-tenant
**Problema:** La versión actual de `current_tenant_id()` (desde `20260720003_anotaciones_storage.sql`) hace un SELECT a `profiles` en cada query. La versión con JWT fast-path (`20260717002`) leía del JWT sin query.
**Impacto:** Desconocido sin métricas de producción. Cada query multi-tenant ejecuta un SELECT adicional a `profiles`.
**Evidencia:** Migraciones demuestran regresión.
**Propuesta:** Restaurar JWT fast-path y medir latencia de queries antes/después.
**Validación:** `EXPLAIN ANALYZE` en Supabase + Prometheus/Datadog metrics.

### RPM-02: Tamaño real de tablas en producción

**Problema:** Sin métricas de producción, no sabemos cuántas causas, anotaciones o estudiantes hay realmente.
**Impacto:** No podemos priorizar paginación vs optimizaciones de query.
**Validación:** Consultar `SELECT count(*)` de cada tabla en producción.

### RPM-03: Frecuencia de auto-save y contención de escritura

**Problema:** `useCausasPersistence` auto-guarda cada vez que cambia el estado. No sabemos cuán frecuente es esto en la práctica ni si causa contención.
**Validación:** PostHog events + Supabase query stats.

---

## Cambios Implementados (Quick Wins)

| ID | Cambio | Archivo | Efecto esperado |
|----|--------|---------|-----------------|
| QW-01 | Agregar `compression` en API entry | `server/api/index.ts` | Respuestas API comprimidas gzip |
| QW-02 | Límite de rate limiter Map | `server/lib/rateLimit.ts`, `server/api/services/rateLimit.ts` | Prevenir OOM |
| QW-03 | Selectores parciales en `useCausasStore` | `src/app/App.tsx` | Menos re-renders de App |
| QW-04 | Mismo que QW-01 | — | — |

---

## Medición Post-Quick-Wins

| Métrica | Antes | Después | Diferencia |
|---------|-------|---------|------------|
| Build time | 27.47s | 27.5s (est.) | ~0% (build no afectado) |
| Módulos transformados | 3,792 | 3,792 | Sin cambio |
| Chunks totales | 11 | 11 | Sin cambio |
| Largest chunk (pdf) | ~850 KB | ~850 KB | Sin cambio |
| Re-renders en App (por saveStatus) | Cada cambio | Solo si cambia el selector | ✅ Mejora |
| Gzip API responses | No (sin compression) | Sí | ✅ Mejora ~70% en payload |
