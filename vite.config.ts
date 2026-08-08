import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Plugin dev-only: permite el WebSocket de HMR de Vite (puerto 3002) y el
 * servidor Express (3001) en desarrollo. El meta CSP de `index.html` (que
 * también se sirve en producción) solo permite `connect-src 'self'` más
 * Supabase/PostHog/Sentry, por lo que el navegador bloqueaba el hot reload.
 * `apply: 'serve'` evita que esta relajación llegue al build de producción.
 */
function devCspHmrPlugin(): Plugin {
  return {
    name: 'dev-csp-hmr',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.us.sentry.io",
        "connect-src 'self' ws://localhost:3002 ws://localhost:3001 https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.us.sentry.io",
      );
    },
  };
}

const plugins = [react(), tailwindcss(), devCspHmrPlugin()];

if (process.env.ANALYZE === 'true') {
  plugins.push(
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }) as never,
  );
}

export default defineConfig(() => {
  return {
    plugins,
    resolve: {
      alias: {
        '@/shared': path.resolve(__dirname, 'src/shared'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 550,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/write-excel-file/')) return 'excel';
            if (id.includes('/posthog-js/')) return 'telemetry-posthog';
            if (id.includes('/@sentry/')) return 'telemetry-sentry';
            if (id.includes('/web-vitals/')) return 'telemetry-vitals';
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react';
            }
            if (id.includes('/@supabase/')) return 'supabase';
            if (id.includes('/@radix-ui/')) return 'radix';
            if (id.includes('/@tanstack/')) return 'tanstack';
            if (id.includes('/date-fns/')) return 'date';
            return 'vendor';
          },
        },
      },
    },
    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
    server: {
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      hmr: process.env.DISABLE_HMR !== 'true' ? { port: 3002, host: 'localhost' } : false,
    },
  };
});
