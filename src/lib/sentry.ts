/** @license SPDX-License-Identifier: Apache-2.0 */

import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE;

export function initSentry() {
  if (SENTRY_DSN) {
    Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      browserTracingIntegration(),
    ],
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // No enviar errores de desarrollo localhost a Sentry
      if (ENVIRONMENT === 'development' && window.location.hostname === 'localhost') {
        return null;
      }
      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'NetworkError',
      'Failed to fetch',
    ],
  });
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

export function setUserContext(user: { id: string; email?: string; role?: string } | null) {
  if (SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

export const SentryReact = Sentry;