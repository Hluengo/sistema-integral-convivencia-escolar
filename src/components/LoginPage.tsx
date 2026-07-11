/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Scale, Loader2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { signInWithEmail } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';

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
    setTimeout(() => emailRef.current?.focus(), 100);
    return () => dialog.close();
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
      className="bg-transparent p-0 m-0 max-w-none w-full h-full rounded-none overflow-hidden"
      aria-label="Iniciar sesión"
      style={{ maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh' }}
      onClose={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div className="flex h-full">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden flex-col justify-between p-10">
          {/* Decorative shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
            <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
            <div className="absolute top-1/3 right-10 w-24 h-24 rounded-2xl bg-white/5 rotate-12" />
            <div className="absolute bottom-1/4 left-8 w-16 h-16 rounded-full bg-white/5" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/90 font-semibold text-sm tracking-wide">Debido Proceso</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Gestión de convivencia<br />escolar con orden
            </h2>
            <p className="text-base text-white/70 leading-relaxed max-w-sm">
              Administre causas disciplinarias, audite el debido proceso y genere documentos oficiales conforme a la Circular N°482 y Ley N°21809.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Sistema operativo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Vercel + Supabase</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center bg-neutral-50 p-6 sm:p-10 relative">
          {/* Mobile close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="w-full max-w-[400px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-lg">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-neutral-800 font-bold text-lg">Debido Proceso</span>
            </div>

            {/* Welcome text */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-neutral-900 mb-1.5">Bienvenido</h1>
              <p className="text-sm text-neutral-500">Ingrese sus credenciales para acceder al sistema</p>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full text-sm bg-white border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
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
                    className="w-full text-sm bg-white border border-neutral-200 rounded-xl px-4 py-3 pr-11 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-neutral-500 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500/20" />
                  Recordarme
                </label>
                <button type="button" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  ¿Olvidó su contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-neutral-400 mt-8">
              Sistema de gestión de convivencia escolar · Chile
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
