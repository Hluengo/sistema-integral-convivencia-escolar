/** @license SPDX-License-Identifier: Apache-2.0 */

import type * as PostHogModule from './posthog';
import type * as SentryModule from './sentry';

type TelemetryModules = {
  posthog: typeof PostHogModule;
  sentry: typeof SentryModule;
};

/** Stub no-op de Sentry para desarrollo: evita descargar el chunk de ~530 KB. */
const NOOP_SENTRY: typeof SentryModule = {
  initSentry: () => {},
  captureException: () => {},
  captureMessage: () => {},
  setUserContext: () => {},
  addBreadcrumb: () => {},
  SentryReact: undefined as never,
};

let telemetryPromise: Promise<TelemetryModules> | null = null;

export function loadTelemetry(): Promise<TelemetryModules> {
  telemetryPromise ??= Promise.all([
    import('./posthog'),
    // Solo producción descarga el chunk de Sentry (browserTracing ~530 KB).
    import.meta.env.MODE === 'production' ? import('./sentry') : Promise.resolve(NOOP_SENTRY),
  ]).then(([posthog, sentry]) => {
    posthog.initPostHog();
    sentry.initSentry();
    return { posthog, sentry };
  });
  return telemetryPromise;
}

export function initializeTelemetry(): void {
  const start = () => {
    void Promise.all([loadTelemetry(), import('./webVitals')]).then(([telemetry, webVitals]) => {
      webVitals.reportWebVitals({
        captureEvent: telemetry.posthog.captureEvent,
        addBreadcrumb: telemetry.sentry.addBreadcrumb,
        captureMessage: telemetry.sentry.captureMessage,
      });
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 8_000 });
  } else {
    globalThis.setTimeout(start, 8_000);
  }
}
