---
name: vite-optimizer
description: Optimiza configuración Vite: build, performance, HMR, plugins. Trigger: Vite, build, optimización, rendimiento,bundle.
---

# Vite Optimizer

Guía para optimizar proyectos Vite.

## Configuración Actual

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  },
  server: {
    proxy: { '/api': 'http://localhost:3001' }
  }
})
```

## Optimizaciones

### Build
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        ui: ['lucide-react']
      }
    }
  },
  chunkSizeWarningLimit: 1000
}
```

### Performance
- Lazy loading de componentes
- Code splitting automático
- Tree shaking
- Minificación con esbuild

### HMR
- Configurar `server.watch`
- Ignorar `node_modules`
- Limitar watching

## Comandos
```bash
npm run build    # Build de producción
npm run preview  # Preview local
npm run dev      # Desarrollo con HMR
```

## Análisis
```bash
npx vite-bundle-visualizer
```

## Comandos Relacionados
- `@vite-optimizer` para Vite
- `@frontend` para UI
- `@developer` para desarrollo
