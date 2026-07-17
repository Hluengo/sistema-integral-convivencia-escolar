import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {defineConfig} from 'vite';
import {visualizer} from 'rollup-plugin-visualizer';

const plugins = [react(), tailwindcss()];

if (process.env.ANALYZE === 'true') {
  plugins.push(visualizer({
    filename: 'dist/stats.html',
    open: true,
    gzipSize: true,
    brotliSize: true,
  }) as never);
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
      // Keep all React-related and generic node_modules in one vendor chunk.
      // Splitting React/scheduler into a separate chunk creates circular
      // dependencies that break at runtime ("Cannot set properties of undefined").
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Feature chunks first (app code)
            if (!id.includes('node_modules')) {
              if (id.includes('Anotaciones')) {
                return 'anotaciones';
              }
              if (id.includes('NewDisciplinaryProcessModal')) {
                return 'new-process';
              }
              if (id.includes('AiAdvisor') || id.includes('AdvisorMessage')) {
                return 'ai-advisor';
              }
              if (id.includes('InteractiveTimeline')) {
                return 'timeline';
              }
              if (
                id.includes('CausaCard') ||
                id.includes('EditCausaModal') ||
                id.includes('NewCausaModal')
              ) {
                return 'causas';
              }
              if (id.includes('TemplateEditor') || id.includes('ClosedCases')) {
                return 'docs';
              }
              return 'index';
            }
            // Only split out the biggest vendor deps to keep chunks reasonable.
            // Everything else (React, scheduler, radix, tanstack, zustand, etc.)
            // stays together in vendor to avoid cross-chunk circular deps.
            if (id.includes('pdf-lib')) {
              return 'pdf';
            }
            if (id.includes('docx')) {
              return 'docx';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
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
