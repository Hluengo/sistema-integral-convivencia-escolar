/** @license SPDX-License-Identifier: Apache-2.0 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import ErrorBoundary from '../components/ErrorBoundary';
import { initializeTelemetry } from '../lib/telemetry';
import PerformanceProfiler from '../lib/PerformanceProfiler';
import AuthAnalytics from './AuthAnalytics';
import App from './App';
import '../index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <PerformanceProfiler id="App">
          <AuthAnalytics />
          <App />
        </PerformanceProfiler>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);

// Telemetry is intentionally deferred so Sentry/PostHog do not compete with
// the first render and initial Supabase/session work.
window.setTimeout(() => initializeTelemetry(), 2000);
