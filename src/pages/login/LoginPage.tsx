/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useRef } from 'react';
import { Scale, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail } from '../../services/auth.service';
import { useAppContext } from '../../context/useAppContext';
import { Dialog, DialogContent } from '../../components/ui/Dialog';

interface LoginPageProps {
  onClose?: () => void;
}

export default function LoginPage({ onClose }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setShowLoginModal } = useAppContext();
  const emailRef = useRef<HTMLInputElement>(null);

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
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifique su email y contraseña.'
          : authError.message
      );
      setIsLoading(false);
      return;
    }
    setShowLoginModal(false);
    setIsLoading(false);
  };

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) { setShowLoginModal(false); onClose?.(); } }}>
      <DialogContent
        className="max-w-[420px] overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          emailRef.current?.focus();
        }}
      >
        <div className="h-1 w-full bg-linear-to-r from-brand-500 via-brand-600 to-brand-700" />

        <div className="p-8 pb-7">
          <div className="mb-7 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25">
              <Scale className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-bold text-neutral-900 text-xl">Iniciar sesión</h1>
            <p className="mt-1 text-neutral-500 text-sm">Acceda para gestionar expedientes</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-red-600 text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block font-semibold text-neutral-600 text-xs"
              >
                Correo electrónico
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@colegio.cl"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 text-sm placeholder-neutral-400 transition-colors duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block font-semibold text-neutral-600 text-xs"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-11 text-neutral-900 text-sm placeholder-neutral-400 transition-colors duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label
                htmlFor="remember-me"
                className="flex cursor-pointer select-none items-center gap-2 text-neutral-500"
              >
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500/20"
                />
                Recordarme
              </label>
              <button
                type="button"
                className="font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-sm text-white shadow-sm transition-colors duration-200 hover:bg-brand-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-brand-400"
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

        <div className="border-t border-neutral-100 bg-neutral-50 px-8 py-4">
          <p className="text-center text-neutral-400 text-xs">
            Debido Proceso · Sistema de convivencia escolar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
