# ADR-0005: Dual Server Entry Points

## Context
El proyecto necesitaba un servidor Express para desarrollo (con Vite HMR) y un handler serverless para Vercel (producción).

## Decisión
Mantener dos entry points sincronizados: `server/index.ts` (dev) y `server/api/index.ts` → `api/index.js` (prod).

## Alternativas Consideradas
- **Express only**: No funciona en Vercel Serverless (necesita middleware completo)
- **Vercel only**: No tiene HMR, difícil desarrollo local
- **Edge Functions**: Podría reemplazar Express, pero no estaba maduro al inicio
- **Single file with conditional logic**: Más frágil que dos archivos separados

## Consecuencias
- **Positivas**: Dev con HMR rápido, prod con serverless escalable
- **Positivas**: Cada entry point optimizado para su entorno
- **Negativas**: Riesgo de drift entre los dos archivos (deben sincronizarse manualmente)
- **Negativas**: Duplicación de middleware y routes
- **Mitigación**: Misma estructura de archivos (`routes/`, `middleware/`, `lib/`) en ambos
