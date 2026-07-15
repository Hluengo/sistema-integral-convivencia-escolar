/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Scale, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail } from '../lib/supabase';
import { useAppContext } from '../context/useAppContext';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const timerId = setTimeout(() => emailRef.current?.focus(), 100);
    return () => {
      clearTimeout(timerId);
      dialog.close();
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = e.clientX >= rect.left && e.clientX <= rect.right &&
                         e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!isInDialog && onClose) onClose();
    };
    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
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
    setShowLoginModal(false);
    setIsLoading(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-auto rounded-2xl overflow-visible"
      aria-label="Iniciar sesión"
      style={{ maxWidth: '420px', width: '92vw' }}
      onClose={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      {/* Backdrop blur */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10" />

      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden">
        {/* Header accent */}
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

        <div className="p-8 pb-7">
          {/* Close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Logo + title */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25 mb-4">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Iniciar sesión</h1>
            <p className="text-sm text-neutral-500 mt-1">Acceda para gestionar expedientes</p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-neutral-600 mb-1.5">
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
                className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-neutral-600 mb-1.5">
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
                  className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 pr-11 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label htmlFor="remember-me" className="flex items-center gap-2 text-neutral-500 cursor-pointer select-none">
                <input 
                  id="remember-me" 
                  name="remember-me" 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500/20" 
                />
                Recordarme
              </label>
              <button type="button" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md mt-2"
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

        {/* Footer */}
        <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-100">
          <p className="text-center text-xs text-neutral-400">
            Debido Proceso · Sistema de convivencia escolar
          </p>
        </div>
      </div>
    </dialog>
  );
}
