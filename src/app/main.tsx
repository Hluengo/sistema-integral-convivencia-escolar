/** @license SPDX-License-Identifier: Apache-2.0 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import ErrorBoundary from '../components/ErrorBoundary';
import { initSentry } from '../lib/sentry';
import { initPostHog } from '../lib/posthog';
import { reportWebVitals } from '../lib/webVitals';
import PerformanceProfiler from '../lib/PerformanceProfiler';
import AuthAnalytics from './AuthAnalytics';
import App from './App';
import '../index.css';

initSentry();
initPostHog();
reportWebVitals();

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
  </StrictMode>
);