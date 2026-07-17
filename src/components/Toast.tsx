import type React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../shared/lib/stores/toastStore';
import type { ToastType } from '../shared/lib/stores/toastStore';

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
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <>
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
    </>
  );
}
