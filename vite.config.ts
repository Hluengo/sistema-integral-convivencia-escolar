import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

dotenv.config({ path: ".env.local", override: true });

/**
 * Plugin dev-only: permite el WebSocket de HMR de Vite (puerto 3002) y el
 * servidor Express (3001) en desarrollo. El meta CSP de `index.html` (que
 * también se sirve en producción) solo permite `connect-src 'self'` más
 * Supabase/PostHog/Sentry, por lo que el navegador bloqueaba el hot reload.
 * `apply: 'serve'` evita que esta relajación llegue al build de producción.
 */
function devCspHmrPlugin(): Plugin {
  return {
    name: "dev-csp-hmr",
    apply: "serve",
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace(
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.us.sentry.io",
          "connect-src 'self' ws://localhost:3002 ws://localhost:3000 https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.us.sentry.io",
        );
    },
  };
}

const plugins = [react(), tailwindcss(), devCspHmrPlugin()];
const projectRoot = import.meta.dirname;

export default defineConfig(() => {
  return {
    plugins,
    resolve: {
      alias: {
        "@/shared": path.resolve(projectRoot, "src/shared"),
        "@": path.resolve(projectRoot, "."),
      },
    },
    build: {
      target: "es2020",
      chunkSizeWarningLimit: 550,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("/write-excel-file/")) return "excel";
            // Solo lo pide el visor de Word, que es un chunk diferido.
            if (id.includes("/docx-preview/") || id.includes("/jszip/")) {
              return "docx-viewer";
            }
            if (id.includes("/posthog-js/")) return "telemetry-posthog";
            if (id.includes("/@sentry/")) return "telemetry-sentry";
            if (id.includes("/web-vitals/")) return "telemetry-vitals";
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "react";
            }
            if (id.includes("/@supabase/")) return "supabase";
            if (id.includes("/@radix-ui/")) return "radix";
            if (id.includes("/@tanstack/")) return "tanstack";
            if (id.includes("/date-fns/")) return "date";
            // pdfjs-dist queda sin chunk propio: si se nombra, entra al grafo
            // estático y se precarga (461 KB) aunque solo lo abre el visor de
            // PDFs; sin nombre sigue al import() diferido que lo pide.
            if (id.includes("/pdfjs-dist/")) return undefined;
            return "vendor";
          },
        },
      },
    },
    optimizeDeps: {
      include: ["@supabase/supabase-js"],
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      watch: process.env.DISABLE_HMR === "true" ? null : {},
      hmr:
        process.env.DISABLE_HMR !== "true"
          ? { port: 3002, host: "localhost" }
          : false,
    },
  };
});
