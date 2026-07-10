import React, { Component, ErrorInfo, ReactNode, createRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  retryButtonRef = createRef<HTMLButtonElement>();

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (!prevState.hasError && this.state.hasError && this.retryButtonRef.current) {
      this.retryButtonRef.current.focus();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div role="alert" aria-live="assertive" className="card p-8 m-4 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gravisima-50 text-gravisima-600 mb-4">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-800 mb-1">Algo salió mal</h3>
          <p className="text-xs text-neutral-500 mb-4 max-w-xs mx-auto">
            Ocurrió un error inesperado. Puede intentar recargar esta sección.
          </p>
          <button
            ref={this.retryButtonRef}
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
