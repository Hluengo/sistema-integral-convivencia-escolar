/** @license SPDX-License-Identifier: Apache-2.0 */

import * as Sentry from "@sentry/browser";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE;

const isValidSentryDsn =
  Boolean(SENTRY_DSN) && !SENTRY_DSN?.includes("your-project@sentry.io");

export function initSentry() {
  if (isValidSentryDsn && SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      // Sin tracing: este proyecto solo necesita captura de errores. La
      // integración de rendimiento duplicaba el chunk de Sentry.
      tracesSampleRate: 0,
      beforeSend(event) {
        // No enviar errores de desarrollo localhost a Sentry
        if (
          ENVIRONMENT === "development" &&
          window.location.hostname === "localhost"
        ) {
          return null;
        }
        return event;
      },
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        "NetworkError",
        "Failed to fetch",
      ],
    });
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (isValidSentryDsn) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>,
) {
  if (isValidSentryDsn) {
    Sentry.captureMessage(message, { level, extra: context });
  }
}

export function setUserContext(
  user: { id: string; email?: string; role?: string } | null,
) {
  if (isValidSentryDsn) {
    Sentry.setUser(user);
  }
}

export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (isValidSentryDsn) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}
