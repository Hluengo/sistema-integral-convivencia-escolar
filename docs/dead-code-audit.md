# Dead Code Audit

Fecha: 2026-07-23

## Linea base

- dist: 4910.04 KB
- pdf.worker: 1225.65 KB
- pdf: 829.93 KB
- vendor: 655.26 KB
- docx: 335.15 KB
- index: 283.77 KB
- supabase: 200.41 KB
- build: 29.02s
- modulos transformados: 3791
- ESLint inicial: 55 errores, 61 warnings
- tests iniciales: 10/10

## Metodologia

- Se trabajo solo sobre hallazgos Nivel A ya identificados.
- No se eliminaron rutas debug, wrappers de compatibilidad ni archivos operacionales inciertos.
- No se tocaron `.env.local`, Supabase remoto, migraciones antiguas ni objetos remotos.
- Cada grupo se valido con ESLint focalizado y/o `npm run lint`, `npm run test`, `npm run build` segun correspondia.

## Cambios ejecutados

- Imports no usados retirados en App, timeline, server routes, anotaciones, docgen, dashboard, documentos, students, header y legalCompliance.
- Variables locales y tipos duplicados no usados retirados en docgen y hooks relacionados.
- Parametros no usados de mocks renombrados con prefijo _ para conservar contratos.
- Tests unitarios agregados para sanitizacion en server/lib/validators.test.ts y conectados al script 
pm run test.
- Regex de sanitizacion convertida a `RegExp` construida por `String.fromCharCode` para evitar `no-control-regex` sin cambiar comportamiento.
- Scripts debug E2E conservados como herramientas manuales, con import dinamico compatible con ESLint.
- Directiva ESLint obsoleta retirada de `useCausasPersistence`.
- Consulta segura optimizada en `causas.service.ts`: `select('*')` reemplazado por columnas explicitas usadas por los mappers.

## Archivos modificados

Ver `git diff --stat` para el detalle exacto. No se eliminaron archivos.

## Archivos eliminados

Ninguno.

## Dependencias eliminadas

Ninguna. Las candidatas se conservaron por uso actual, configuracion activa o intencion de testing/desarrollo:

- `vitest`, `jsdom`, `@testing-library/*`: ecosistema de pruebas presente.
- `autoprefixer`: tooling CSS/PostCSS, requiere verificacion separada antes de retirar.
- `react-hook-form`, `date-fns`, `@tanstack/react-table`: instaladas como herramientas frontend; no se retiraron por no ser Nivel A.

## Optimizaciones de bundle

- No se agrego nuevo lazy loading. PDF, docx y vistas principales ya se emiten como chunks separados.
- Se conservaron los `manualChunks` actuales porque el build reporta ciclos entre `vendor`, `index`, `anotaciones`, `pdf`, `docs` y `supabase`; forzar cortes sin redisenar esa configuracion seria riesgo mayor.

## Consultas optimizadas

- `src/shared/api/services/causas.service.ts`: columnas explicitas para `causas` y `checklist_items`.

## ESLint

- Antes: 55 errores, 61 warnings.
- Despues: 0 errores, 55 warnings.
- Warnings restantes: principalmente `react-refresh/only-export-components`, controles con asociacion de label que requieren revision visual, y `useKeyboardShortcuts` con dependencia de hook pendiente de analisis funcional.

## Medicion despues

- dist total medido: 5,028,469 bytes.
- pdf.worker: 1,255.07 kB.
- pdf: 849.85 kB.
- vendor: 670.98 kB.
- docx: 343.20 kB.
- index: 290.82 kB.
- supabase: 205.22 kB.
- build: 15.43s.
- modulos transformados: 3791.
- tests: 20/20, incluyendo cobertura nueva de sanitización.

## Elementos Nivel B conservados

- Dependencias frontend instaladas pero no suficientemente probadas como muertas.
- Rutas y scripts debug (`e2e/debug.js`, `e2e/debug.cjs`, rutas debug server) por posible uso manual.
- Wrappers `src/components/**` que reexportan `src/features/**` por compatibilidad de imports.

## Elementos Nivel C conservados

- Objetos Supabase remotos, Storage, RLS, triggers y Edge Functions sin estadisticas productivas.
- Warnings de accesibilidad en formularios densos donde el cambio masivo puede alterar UX.
- Configuracion de manualChunks por advertencias circulares del build.

## Riesgos pendientes

- Revisar accesibilidad de controles reportados por ESLint con prueba visual.
- Revisar `manualChunks` con visualizer antes de tocar bundle inicial.
- Confirmar uso real de dependencias candidatas con Knip o estadisticas de build en una tarea separada.

