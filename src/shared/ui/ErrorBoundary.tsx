/** @license SPDX-License-Identifier: Apache-2.0 */

import { Component, type ErrorInfo, type ReactNode, createRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_RELOAD_STORAGE_PREFIX = 'sice:chunk-reload:';
const CHUNK_LOAD_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk \d+ failed/i,
  /error loading dynamically imported module/i,
];

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;

  const description = `${error.name} ${error.message}`;
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(description));
}

function getChunkReloadKey(error: Error): string {
  const locationKey = `${window.location.pathname}${window.location.search}`;
  return `${CHUNK_RELOAD_STORAGE_PREFIX}${locationKey}:${error.name}`;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  retryButtonRef = createRef<HTMLButtonElement>();

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    if (isChunkLoadError(error)) {
      this.reloadStaleChunkOnce(error);
    }
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    if (!prevState.hasError && this.state.hasError && this.retryButtonRef.current) {
      this.retryButtonRef.current.focus();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  reloadStaleChunkOnce(error: Error) {
    try {
      const reloadKey = getChunkReloadKey(error);
      if (sessionStorage.getItem(reloadKey) === '1') return;

      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    } catch {
      // If storage is unavailable, keep the manual reload fallback visible.
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isStaleChunk = isChunkLoadError(this.state.error);
      const title = isStaleChunk ? 'La app necesita actualizarse' : 'Algo salió mal';
      const message = isStaleChunk
        ? 'Se detectó una versión anterior de esta sección. Recargue la app para continuar.'
        : 'Ocurrió un error inesperado. Puede intentar recargar esta sección.';
      const actionLabel = isStaleChunk ? 'Recargar aplicación' : 'Reintentar';

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="card m-4 animate-scale-in p-8 text-center"
        >
          <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-gravisima-50 p-3 text-gravisima-600">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mb-1 font-semibold text-neutral-800 text-sm">{title}</h3>
          <p className="mx-auto mb-4 max-w-xs text-neutral-500 text-xs">{message}</p>
          <button
            ref={this.retryButtonRef}
            type="button"
            onClick={isStaleChunk ? this.handleReload : this.handleRetry}
            className="inline-flex items-center gap-1.5 font-semibold text-brand-600 text-xs transition-colors hover:text-brand-700"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {actionLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
