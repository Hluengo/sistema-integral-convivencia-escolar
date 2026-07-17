/** @license SPDX-License-Identifier: Apache-2.0 */

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import ErrorBoundary from './components/ErrorBoundary';
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';
import { reportWebVitals } from './lib/webVitals';
import { identifyAnalyticsUser, resetAnalyticsUser } from './lib/analytics';
import { useAuthStore } from './stores/authStore';
import PerformanceProfiler from './lib/PerformanceProfiler';
import App from './App.tsx';
import './index.css';

initSentry();
initPostHog();
reportWebVitals();

function AuthAnalytics() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      identifyAnalyticsUser(user);
    } else {
      resetAnalyticsUser();
    }
  }, [user, authLoading]);

  return null;
}

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