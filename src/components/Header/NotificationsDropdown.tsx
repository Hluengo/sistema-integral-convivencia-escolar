import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useEscapeClose } from './hooks/useEscapeClose';

interface Notification {
  id: number | string;
  title: string;
  description: string;
  time: string;
  urgent: boolean;
  causaId?: string;
}

interface NotificationsDropdownProps {
  notifications: Notification[];
  onNotificationClick?: (causaId: string) => void;
}

export default function NotificationsDropdown({ notifications, onNotificationClick }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeDropdown = useCallback(() => setIsOpen(false), []);

  useEscapeClose(isOpen, closeDropdown);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const urgentCount = notifications.filter((n) => n.urgent).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer rounded-xl p-2.5 text-neutral-500 transition-colors hover:bg-neutral-100"
        aria-label="Notificaciones"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {urgentCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gravisima-500 ring-2 ring-white"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={dropdownRef}
            className="absolute top-full right-0 z-50 mt-2 w-[min(360px,calc(100vw-2rem))] animate-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
          >
            <div className="border-neutral-100 border-b p-4">
              <h3 className="font-bold text-neutral-900 text-sm">Notificaciones</h3>
              <p className="mt-0.5 text-neutral-400 text-xs">
                {urgentCount} requieren atención
              </p>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <Bell className="mb-2 h-6 w-6 text-neutral-300" aria-hidden="true" />
                  <p className="font-medium text-neutral-500 text-sm">Sin notificaciones</p>
                  <p className="text-neutral-400 text-xs">No hay alertas ni plazos próximos a vencer</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNotificationClick?.(n.causaId!);
                    }}
                    className="flex w-full items-start gap-3 border-neutral-100 border-b p-4 text-left transition-colors last:border-b-0 hover:bg-neutral-50"
                  >
                    <div className={`shrink-0 rounded-lg p-1.5 ${n.urgent ? 'bg-gravisima-50' : 'bg-brand-50'}`}>
                      <Bell
                        className={`h-3.5 w-3.5 ${n.urgent ? 'text-gravisima-600' : 'text-brand-600'}`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[12px] text-neutral-900">{n.title}</p>
                      <p className="mt-0.5 text-neutral-500 text-xs">{n.description}</p>
                      <span className="mt-1 block text-neutral-400 text-xs">{n.time}</span>
                    </div>
                    {n.urgent && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gravisima-500" aria-hidden="true" />
                    )}
                  </button>
                )))}
            </div>
            <div className="border-neutral-100 border-t p-3 text-center">
              <button
                type="button"
                className="font-semibold text-brand-600 text-xs transition-colors hover:text-brand-700"
              >
                Ver todas las notificaciones
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}