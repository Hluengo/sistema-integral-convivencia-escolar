/** @license SPDX-License-Identifier: Apache-2.0 */

import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals';

type BreadcrumbLevel = 'info' | 'warning' | 'error';

interface WebVitalsTelemetry {
  captureEvent: (event: string, properties?: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: {
    category: string;
    message: string;
    level: BreadcrumbLevel;
  }) => void;
  captureMessage: (
    message: string,
    level: BreadcrumbLevel,
    context?: Record<string, unknown>,
  ) => void;
}

function sendToAnalytics(metric: Metric, telemetry: WebVitalsTelemetry) {
  const { name, value, rating, delta, id } = metric;

  telemetry.captureEvent('web_vital', {
    metric_name: name,
    metric_value: value,
    metric_rating: rating,
    metric_delta: delta,
    metric_id: id,
  });

  telemetry.addBreadcrumb({
    category: 'web_vital',
    message: `${name}: ${value} (${rating})`,
    level: rating === 'good' ? 'info' : rating === 'needs-improvement' ? 'warning' : 'error',
  });

  if (rating !== 'good' && rating !== 'needs-improvement') {
    telemetry.captureMessage(`Poor Web Vital: ${name}`, 'warning', {
      metric_value: value,
      metric_rating: rating,
    });
  }
}

export function reportWebVitals(telemetry: WebVitalsTelemetry) {
  const report = (metric: Metric) => sendToAnalytics(metric, telemetry);
  onLCP(report);
  onINP(report);
  onCLS(report);
  onFCP(report);
  onTTFB(report);
}
