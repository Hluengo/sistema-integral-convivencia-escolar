# ADR-0005: Dual Server Entry Points

## Context

El proyecto necesitaba un servidor Express para desarrollo (con Vite HMR) y un handler serverless para Vercel (producción).

## Decisión

Mantener dos entry points: `server/index.ts` (dev) y `server/api/index.ts` → `api/index.js` (prod). Ambos registran las mismas implementaciones canónicas desde `server/api/routes/`.

## Alternativas Consideradas

- **Express only**: No funciona en Vercel Serverless (necesita middleware completo)
- **Vercel only**: No tiene HMR, difícil desarrollo local
- **Edge Functions**: Podría reemplazar Express, pero no estaba maduro al inicio
- **Single file with conditional logic**: Más frágil que dos entry points pequeños
- **Rutas duplicadas por entorno**: Provocaban drift funcional y correcciones aplicadas solo en desarrollo o producción

## Consecuencias

- **Positivas**: Dev con HMR rápido, prod con serverless escalable
- **Positivas**: Cada entry point optimizado para su entorno
- **Positivas**: Una corrección de endpoint aplica por igual en desarrollo y producción
- **Negativas**: El registro de una ruta nueva todavía debe añadirse a ambos entry points
- **Mitigación**: La lógica de cada endpoint, middleware y servicio existe en una única ubicación canónica
