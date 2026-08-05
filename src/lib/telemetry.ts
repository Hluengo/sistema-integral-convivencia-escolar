/** @license SPDX-License-Identifier: Apache-2.0 */

import type * as PostHogModule from './posthog';
import type * as SentryModule from './sentry';

type TelemetryModules = {
  posthog: typeof PostHogModule;
  sentry: typeof SentryModule;
};

let telemetryPromise: Promise<TelemetryModules> | null = null;

export function loadTelemetry(): Promise<TelemetryModules> {
  telemetryPromise ??= Promise.all([import('./posthog'), import('./sentry')]).then(
    ([posthog, sentry]) => {
      posthog.initPostHog();
      sentry.initSentry();
      return { posthog, sentry };
    },
  );
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
