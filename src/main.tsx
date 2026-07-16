/** @license SPDX-License-Identifier: Apache-2.0 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/ErrorBoundary';
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';
import App from './App.tsx';
import './index.css';

// Initialize Sentry as early as possible
initSentry();

// Initialize PostHog
initPostHog();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);