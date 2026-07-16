import type React from 'react';
import { createContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-leve-600" aria-hidden="true" />,
  error: <XCircle className="h-4 w-4 text-gravisima-600" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-grave-600" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-brand-500" aria-hidden="true" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-leve-200 bg-leve-50',
  error: 'border-gravisima-200 bg-gravisima-50',
  warning: 'border-grave-200 bg-grave-50',
  info: 'border-brand-200 bg-brand-50',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 4000);
    timersRef.current.set(id, timer);
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const contextValue = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed top-20 right-4 z-[100] flex flex-col gap-2"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex max-w-sm animate-toast-in items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${TOAST_STYLES[toast.type]}`}
          >
            {TOAST_ICONS[toast.type]}
            <span className="flex-1 font-medium text-neutral-700 text-xs">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-600"
              aria-label="Cerrar notificación"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
