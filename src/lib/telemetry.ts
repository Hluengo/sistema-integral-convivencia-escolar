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
  void Promise.all([loadTelemetry(), import('./webVitals')]).then(([, webVitals]) => {
    webVitals.reportWebVitals();
  });
}
