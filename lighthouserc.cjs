/** @license SPDX-License-Identifier: Apache-2.0 */

module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve-dist.mjs --port=3011",
      startServerReadyPattern: "Static dist server running at",
      url: ["http://localhost:3011/"],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        // Sin estos flags Chrome se queda sin pintar y Lighthouse aborta con
        // NO_FCP en runners y contenedores (poco /dev/shm, sin GPU).
        chromeFlags: [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
