import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: '.env.local' });

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3001';
const shouldStartWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true' || !process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120 * 1000,
      }
    : undefined,
});
