---
description: Build completo: lint + build + verificación de output
agent: build
---

Ejecuta el build completo del proyecto:

1. `npm run lint` — verificar que TypeScript pasa
2. `npm run build` — build de Vite + esbuild
3. Verificar que `dist/` tiene contenido
4. Verificar que `api/index.js` existe
5. Reportar tamaño del bundle y archivos generados

Si hay errores, describe cada uno con su archivo y línea.
