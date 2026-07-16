import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Feature chunks first (app code)
            if (!id.includes('node_modules')) {
              if (id.includes('Anotaciones')) return 'anotaciones';
              if (id.includes('NewDisciplinaryProcessModal')) return 'new-process';
              if (id.includes('AiAdvisor') || id.includes('AdvisorMessage')) return 'ai-advisor';
              if (id.includes('InteractiveTimeline')) return 'timeline';
              if (id.includes('CausaCard') || id.includes('EditCausaModal') || id.includes('NewCausaModal')) return 'causas';
              if (id.includes('TemplateEditor') || id.includes('ClosedCases')) return 'docs';
              return 'index';
            }
            // Vendor chunks (node_modules)
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('pdf-lib')) return 'pdf';
            if (id.includes('docx')) return 'docx';
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('@tanstack')) return 'tanstack-query';
            if (id.includes('zustand')) return 'zustand';
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