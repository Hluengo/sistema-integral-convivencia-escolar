/** @license SPDX-License-Identifier: Apache-2.0 */

import type { User } from '@supabase/supabase-js';
import { loadTelemetry } from './telemetry';

export type AnalyticsEvent =
  | 'screen_viewed'
  | 'causa_created'
  | 'causa_opened'
  | 'document_generated'
  | 'chat_message_sent'
  | 'annotation_added'
  | 'annotation_edited'
  | 'search_performed'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'error_caught'
  | 'feature_used'
  | 'causas_query_completed';

export interface AnalyticsPayload {
  screen_viewed: { screen: string };
  causa_created: { course?: string; type?: string };
  causa_opened: { causaId: string };
  document_generated: { docType: string; format: 'pdf' | 'docx' };
  chat_message_sent: { role: 'user' | 'assistant'; messageLength: number };
  annotation_added: { type: string };
  annotation_edited: { annotationId: string };
  search_performed: { resultsCount: number };
  user_logged_in: { method: 'email' | 'google' };
  user_logged_out: Record<string, never>;
  error_caught: { errorMessage: string; component?: string };
  feature_used: { feature: string };
  causas_query_completed: {
    scope: 'list' | 'detail';
    durationMs: number;
    resultCount: number;
  };
}

type PostHogProperties = Record<string, unknown>;

function toPostHog<E extends AnalyticsEvent>(
  event: E,
  payload: AnalyticsPayload[E],
): PostHogProperties {
  return payload as PostHogProperties;
}

export function track<E extends AnalyticsEvent>(event: E, payload: AnalyticsPayload[E]): void {
  const phProperties = toPostHog(event, payload);

  void loadTelemetry().then(({ posthog, sentry }) => {
    posthog.captureEvent(event, phProperties);
    sentry.addBreadcrumb({
      category: 'analytics',
      message: event,
      data: phProperties,
      level: 'info',
    });
  });
}

export function identifyAnalyticsUser(user: User): void {
  void loadTelemetry().then(({ posthog, sentry }) => {
    posthog.identifyUser(user.id);
    sentry.setUserContext({ id: user.id });
  });
}

export function resetAnalyticsUser(): void {
  void loadTelemetry().then(({ posthog, sentry }) => {
    posthog.resetUser();
    sentry.setUserContext(null);
  });
}
