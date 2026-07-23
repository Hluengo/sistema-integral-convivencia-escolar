# Architecture Decisions — Sistema Integral de Convivencia Escolar

## Decisiones Clave

| # | Decisión | Alternativas | Razón |
|---|----------|-------------|-------|
| 1 | **React Query** sobre SWR/RTK Query | SWR, RTK Query, Apollo | Caché configurable, staleTime, retry, devtools |
| 2 | **Zustand** sobre Redux/Context | Redux Toolkit, Jotai, Valtio | Sin boilerplate, TypeScript nativo, tamaño 1KB |
| 3 | **FSD** sobre estructura plana | Atomic Design, feature folders | Escalable, domain isolation, testable |
| 4 | **State-driven routing** sobre React Router | React Router, TanStack Router | Simplicidad (app SPA sin SSR), evita waterfall de auth |
| 5 | **Dual server entry** sobre server único | Express only, Vercel only | Vercel no soporta Express middleware completo; dev necesita HMR |
| 6 | **JWT HMAC + API fallback** sobre solo HMAC | Solo HMAC, solo API, JWKS | HMAC rápido para HS256, API fallback para ES256 (rotación Supabase) |
| 7 | **pdfjs-dist + regex** sobre AI para PDF | GPT-4 Vision, Tesseract OCR | Costo cero, determinista, 22 tests pasando |
| 8 | **Temperature 0** en AI | Temperature 0.3-0.7 | Output determinista para documentos legales |
| 9 | **Sin React Router** | React Router, TanStack Router | Proyecto SPA sin necesidad de URLs navegables; estado global es suficiente |
| 10 | **Multi-tenant via tenant_id** | Schema-per-tenant, DB-per-tenant | Simplicidad operacional, RLS nativo de Supabase |

## Decisiones Pendientes

| Tema | Propuesta | Status |
|------|-----------|--------|
| Migrar a Edge Functions | Reemplazar Express por Supabase Edge Functions | En evaluación |
| Unificar test runners | Vitest sobre tsx --test | Planificado |
| React Router para deep linking | Agregar react-router-dom v7 | Futuro roadmap |
| SSR con Next.js | App router completo | Largo plazo |
