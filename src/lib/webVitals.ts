/** @license SPDX-License-Identifier: Apache-2.0 */

import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';
import { captureEvent } from './posthog';

function sendToAnalytics(metric: Metric) {
  const { name, value, rating, delta, id } = metric;

  captureEvent('web_vital', {
    metric_name: name,
    metric_value: value,
    metric_rating: rating,
    metric_delta: delta,
    metric_id: id,
  });

  Sentry.addBreadcrumb({
    category: 'web_vital',
    message: `${name}: ${value} (${rating})`,
    level: rating === 'good' ? 'info' : rating === 'needs-improvement' ? 'warning' : 'error',
  });

  if (rating !== 'good' && rating !== 'needs-improvement') {
    Sentry.captureMessage(`Poor Web Vital: ${name}`, {
      level: 'warning',
      extra: { metric_value: value, metric_rating: rating },
    });
  }
}

export function reportWebVitals() {
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
