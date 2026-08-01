/** @license SPDX-License-Identifier: Apache-2.0 */

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'set PORT=3011&& node scripts/serve-dist.mjs',
      startServerReadyPattern: 'Static dist server running at',
      url: ['http://localhost:3011/'],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
