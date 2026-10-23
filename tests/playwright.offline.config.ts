import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: [
    "session-drafts.spec.ts",
    "edit-causa-conducta.spec.ts",
    "edit-causa-gate.spec.ts",
  ],
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: { browserName: "chromium" },
  projects: [
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "movil",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
