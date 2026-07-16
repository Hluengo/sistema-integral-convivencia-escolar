/** @license SPDX-License-Identifier: Apache-2.0 */

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;
const ENVIRONMENT = import.meta.env.MODE;

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  
  if (POSTHOG_KEY && POSTHOG_HOST) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (ph) => {
        // Configurar propiedades de usuario si hay sesión
        const user = ph.get_property('$user_id');
        if (user) {
          ph.identify(user);
        }
      },
    });
    initialized = true;
  }
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (initialized && POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (initialized && POSTHOG_KEY) {
    posthog.identify(userId, traits);
  }
}

export function resetUser() {
  if (initialized && POSTHOG_KEY) {
    posthog.reset();
  }
}

export function setUserProperties(properties: Record<string, unknown>) {
  if (initialized && POSTHOG_KEY) {
    posthog.people.set(properties);
  }
}

export const PostHog = posthog;