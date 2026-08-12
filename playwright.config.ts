import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: '.env.local' });

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3001';
const shouldStartWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true' || !process.env.CI;

export default defineConfig({
  testDir: './tests',
  // Las pruebas autenticadas comparten el tenant de E2E; serializar evita
  // carreras de sesión y límites de API que falsean resultados de UI.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        // El servidor de desarrollo puede fallar en Windows cuando esbuild no
        // puede leer el directorio padre. El bundle de producción evita ese
        // problema y prueba el mismo shell que se publica.
        command: 'npm run build && npm run start',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180 * 1000,
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      }
    : undefined,
});
