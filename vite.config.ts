import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase': ['@supabase/supabase-js'],
            'icons': ['lucide-react'],
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
