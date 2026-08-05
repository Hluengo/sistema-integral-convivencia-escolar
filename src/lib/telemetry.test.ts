/** @license SPDX-License-Identifier: Apache-2.0 */

import { ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const root = resolve(import.meta.dirname!, '../..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf-8');

describe('Telemetría y CSP', () => {
  it('carga Sentry y PostHog fuera del bundle inicial', () => {
    const main = read('src/app/main.tsx');
    const telemetry = read('src/lib/telemetry.ts');
    const analytics = read('src/lib/analytics.ts');
    const webVitals = read('src/lib/webVitals.ts');

    ok(main.includes('initializeTelemetry()'));
    ok(!main.includes("from '../lib/sentry'"));
    ok(!main.includes("from '../lib/posthog'"));
    ok(telemetry.includes("import('./posthog')"));
    ok(telemetry.includes("import('./sentry')"));
    ok(!read('src/lib/sentry.ts').includes("from '@sentry/react'"));
    ok(!analytics.includes("from '@sentry/react'"));
    ok(!analytics.includes("from './posthog'"));
    ok(!webVitals.includes("from '@sentry/react'"));
    ok(!webVitals.includes("from './posthog'"));
  });

  it('mantiene Sentry sin Session Replay', () => {
    const sentry = read('src/lib/sentry.ts');

    ok(!sentry.includes('replaysOnErrorSampleRate'));
    ok(!sentry.includes('replaysSessionSampleRate'));
  });

  it('evita importar Google Fonts desde CSS', () => {
    const css = read('src/index.css');
    const html = read('index.html');

    ok(!css.includes('fonts.googleapis.com'));
    ok(html.includes('fonts.googleapis.com'));
    ok(html.includes('JetBrains+Mono'));
  });

  it('mantiene una CSP coherente entre HTML y Vercel sin unsafe-eval', () => {
    const html = read('index.html');
    const vercel = read('vercel.json');

    for (const policy of [html, vercel]) {
      ok(policy.includes("script-src 'self'"));
      ok(!policy.includes("'unsafe-eval'"));
      ok(policy.includes('https://*.supabase.co'));
      ok(policy.includes('https://*.posthog.com'));
      ok(policy.includes('https://*.ingest.us.sentry.io'));
      ok(policy.includes("worker-src 'self' blob:"));
      ok(!policy.includes('https://openrouter.ai'));
    }
  });
});
