/** @license SPDX-License-Identifier: Apache-2.0 */

import * as Sentry from '@sentry/react';
import { captureEvent, identifyUser, resetUser, PostHog } from './posthog';
import { captureException as sentryCaptureException, addBreadcrumb } from './sentry';
import type { User } from '@supabase/supabase-js';

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
  | 'feature_used';

export interface AnalyticsPayload {
  screen_viewed: { screen: string };
  causa_created: { studentName?: string; course?: string; type?: string };
  causa_opened: { causaId: string };
  document_generated: { docType: string; format: 'pdf' | 'docx' };
  chat_message_sent: { role: 'user' | 'assistant'; messageLength: number };
  annotation_added: { studentId: string; type: string };
  annotation_edited: { annotationId: string };
  search_performed: { query: string; resultsCount: number };
  user_logged_in: { method: 'email' | 'google' };
  user_logged_out: Record<string, never>;
  error_caught: { errorMessage: string; component?: string };
  feature_used: { feature: string };
}

type PostHogProperties = Record<string, unknown>;

function toPostHog<E extends AnalyticsEvent>(
  event: E,
  payload: AnalyticsPayload[E],
): PostHogProperties {
  return payload as PostHogProperties;
}

export function track<E extends AnalyticsEvent>(
  event: E,
  payload: AnalyticsPayload[E],
): void {
  const phProperties = toPostHog(event, payload);

  captureEvent(event, phProperties);

  addBreadcrumb({
    category: 'analytics',
    message: event,
    data: phProperties,
    level: 'info',
  });
}

export function trackError(error: unknown, context?: Record<string, unknown>): void {
  sentryCaptureException(error, context);

  track('error_caught', {
    errorMessage: error instanceof Error ? error.message : String(error),
    component: context?.component as string | undefined,
  });
}

export function identifyAnalyticsUser(user: User): void {
  const traits = {
    email: user.email,
    role: user.user_metadata?.role ?? 'unknown',
    name: user.user_metadata?.full_name ?? user.email,
  };

  identifyUser(user.id, traits);

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    username: user.email ?? undefined,
  });
}

export function resetAnalyticsUser(): void {
  resetUser();
  Sentry.setUser(null);
}

export function setAnalyticsUserProperties(properties: Record<string, unknown>): void {
  if (PostHog) {
    PostHog.people?.set(properties);
  }
}

export function getFeatureFlag(key: string): boolean | string | undefined {
  return PostHog?.getFeatureFlag(key);
}

export function onFeatureFlags(callback: (flags: string[]) => void): () => void {
  if (PostHog) {
    return PostHog.onFeatureFlags(callback);
  }
  return () => {};
}
