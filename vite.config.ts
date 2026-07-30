import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const plugins = [react(), tailwindcss()];

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
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 700,
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
            if (id.includes('/pdf-lib/') || id.includes('/pdfjs-dist/') || id.includes('/docx/')) {
              return 'documents';
            }
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
