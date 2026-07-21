import { Eye, EyeOff } from 'lucide-react';

interface PrivacyToggleProps {
  privacyMode: boolean;
  onToggle: () => void;
}

export default function PrivacyToggle({ privacyMode, onToggle }: PrivacyToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border px-2.5 py-1.5 font-semibold text-[12px] transition-colors duration-200 sm:px-3 ${
        privacyMode
          ? 'border-grave-200 bg-grave-50 text-grave-700 hover:bg-grave-100'
          : 'border-neutral-200/60 bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
      aria-label={privacyMode ? 'Desactivar modo privacidad' : 'Activar modo privacidad'}
      aria-pressed={privacyMode}
      title={privacyMode ? 'Nombres protegidos' : 'Nombres visibles'}
    >
      {privacyMode ? (
        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{privacyMode ? 'Privacidad' : 'Nombres'}</span>
    </button>
  );
}