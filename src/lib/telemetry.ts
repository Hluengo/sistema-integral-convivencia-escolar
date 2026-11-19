/** @license SPDX-License-Identifier: Apache-2.0 */

import type * as PostHogModule from "./posthog";
import type * as SentryModule from "./sentry";

type TelemetryModules = {
  posthog: typeof PostHogModule;
  sentry: typeof SentryModule;
};

/** Stub no-op de Sentry para desarrollo: evita descargar su chunk. */
const NOOP_SENTRY: typeof SentryModule = {
  initSentry: () => {},
  captureException: () => {},
  captureMessage: () => {},
  setUserContext: () => {},
  addBreadcrumb: () => {},
};

/** Stub no-op de PostHog cuando el proyecto no tiene analytics configurado. */
const NOOP_POSTHOG: typeof PostHogModule = {
  initPostHog: () => {},
  captureEvent: () => {},
  identifyUser: () => {},
  resetUser: () => {},
  setUserProperties: () => {},
};

let telemetryPromise: Promise<TelemetryModules> | null = null;

export function loadTelemetry(): Promise<TelemetryModules> {
  telemetryPromise ??= Promise.all([
    // Sin clave y host no hay nada que enviar: no se descarga el chunk (~215 KB).
    import.meta.env.VITE_POSTHOG_KEY && import.meta.env.VITE_POSTHOG_HOST
      ? import("./posthog")
      : Promise.resolve(NOOP_POSTHOG),
    // Sentry solo en producción y con DSN: sin los dos, el chunk sobra.
    import.meta.env.MODE === "production" && import.meta.env.VITE_SENTRY_DSN
      ? import("./sentry")
      : Promise.resolve(NOOP_SENTRY),
  ]).then(([posthog, sentry]) => {
    posthog.initPostHog();
    sentry.initSentry();
    return { posthog, sentry };
  });
  return telemetryPromise;
}

export function initializeTelemetry(): void {
  const start = () => {
    void Promise.all([loadTelemetry(), import("./webVitals")]).then(
      ([telemetry, webVitals]) => {
        webVitals.reportWebVitals({
          captureEvent: telemetry.posthog.captureEvent,
          addBreadcrumb: telemetry.sentry.addBreadcrumb,
          captureMessage: telemetry.sentry.captureMessage,
        });
      },
    );
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 8_000 });
  } else {
    globalThis.setTimeout(start, 8_000);
  }
}
