import React, { useState, useEffect } from 'react';
import { Scale, Loader2, AlertCircle, X } from 'lucide-react';
import { signInWithEmail } from '../lib/supabase';

interface LoginPageProps {
  onClose?: () => void;
}

export default function LoginPage({ onClose }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Ingrese email y contraseña.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: authError } = await signInWithEmail(email, password);

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Verifique su email y contraseña.'
        : authError.message);
      setIsLoading(false);
      return;
    }
    // Auth listener in App.tsx handles the state update
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Iniciar sesión"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-2 -right-2 p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg mb-3">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-neutral-900">Iniciar sesión</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">Acceso para gestionar causas</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 shadow-xl p-5 space-y-3">
          <div>
            <label htmlFor="login-email" className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@colegio.cl"
              autoComplete="email"
              required
              className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-2.5 rounded-lg bg-gravisima-50 border border-gravisima-200 text-gravisima-700 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
