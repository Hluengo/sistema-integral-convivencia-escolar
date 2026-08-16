/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Scale } from 'lucide-react';
import {
  requestPasswordReset,
  signInWithEmail,
  signOut,
  updatePassword,
} from '../../shared/api/services/auth.service';
import {
  type LoginFormValues,
  loginFormSchema,
  passwordResetRequestSchema,
  passwordUpdateFormSchema,
} from '../../shared/lib/schemas/loginForm';
import { useAppContext } from '../../shared/lib/useAppContext';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import { Dialog, DialogContent } from '../../shared/ui/Dialog';
import Button from '../../shared/ui/Button';

interface LoginPageProps {
  onClose?: () => void;
}

type AuthMode = 'login' | 'request-reset' | 'update-password';

type LoginFormField = keyof LoginFormValues;

const LOGIN_FIELD_NAMES: LoginFormField[] = ['email', 'password', 'passwordConfirmation'];

function isLoginFormField(field: unknown): field is LoginFormField {
  return typeof field === 'string' && LOGIN_FIELD_NAMES.includes(field as LoginFormField);
}

export default function LoginPage({ onClose }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>(() =>
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem('supabase-password-recovery') === 'true'
      ? 'update-password'
      : 'login',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setShowLoginModal } = useAppContext();
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const clearSessionExpired = useAuthStore((state) => state.clearSessionExpired);
  const emailRef = useRef<HTMLInputElement>(null);
  const {
    register,
    setError: setFieldError,
    clearErrors,
    resetField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onChange',
  });
  const emailRegistration = register('email');

  useEffect(() => {
    if (sessionExpired) {
      setNotice('La sesión expiró. Inicie sesión nuevamente para continuar.');
      clearSessionExpired();
    }
  }, [clearSessionExpired, sessionExpired]);

  const resetMessages = () => {
    setError(null);
    setNotice(null);
    clearErrors();
  };

  const changeMode = (nextMode: AuthMode) => {
    resetMessages();
    resetField('password');
    resetField('passwordConfirmation');
    setMode(nextMode);
  };

  const applyValidationIssues = (issues: Array<{ path: PropertyKey[]; message: string }>) => {
    for (const issue of issues) {
      const [field] = issue.path;
      if (isLoginFormField(field)) {
        setFieldError(field, { type: 'validate', message: issue.message });
      }
    }
  };

  const handleLogin = handleSubmit(async (values) => {
    const parsed = loginFormSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationIssues(parsed.error.issues);
      setError('Revise los datos de inicio de sesión.');
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      const { email, password } = parsed.data;
      const { error: authError } = await signInWithEmail(email.trim(), password);
      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifique su email y contraseña.'
            : authError.message,
        );
        return;
      }
      setShowLoginModal(false);
    } finally {
      setIsLoading(false);
    }
  });

  const handleResetRequest = handleSubmit(async (values) => {
    const parsed = passwordResetRequestSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationIssues(parsed.error.issues);
      setError('Ingrese un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      const { error: authError } = await requestPasswordReset(parsed.data.email.trim());
      if (authError) {
        setError(authError.message);
        return;
      }
      setNotice(
        'Si la cuenta existe, recibirá un correo con el enlace para crear una contraseña nueva.',
      );
    } finally {
      setIsLoading(false);
    }
  });

  const handlePasswordUpdate = handleSubmit(async (values) => {
    const parsed = passwordUpdateFormSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationIssues(parsed.error.issues);
      setError('Revise la nueva contraseña.');
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      const { error: authError } = await updatePassword(parsed.data.password);
      if (authError) {
        setError(authError.message);
        return;
      }
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('supabase-password-recovery');
      }
      clearSessionExpired();
      await signOut();
      resetField('password');
      resetField('passwordConfirmation');
      setMode('login');
      setNotice('Contraseña actualizada. Ya puede iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  });

  const title =
    mode === 'login'
      ? 'Iniciar sesión'
      : mode === 'request-reset'
        ? 'Recuperar contraseña'
        : 'Crear nueva contraseña';

  const subtitle =
    mode === 'login'
      ? 'Acceda para gestionar expedientes'
      : mode === 'request-reset'
        ? 'Le enviaremos un enlace seguro a su correo'
        : 'Ingrese y confirme su nueva contraseña';

  return (
    <Dialog
      open
      onOpenChange={(open: boolean) => {
        if (!open && mode !== 'update-password') {
          setShowLoginModal(false);
          onClose?.();
        }
      }}
    >
      <DialogContent
        className="max-w-[420px] overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          if (mode !== 'update-password') emailRef.current?.focus();
        }}
      >
        <div className="h-1 w-full bg-linear-to-r from-brand-500 via-brand-600 to-brand-700" />
        <div className="p-8 pb-7">
          <div className="mb-7 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25">
              <Scale className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-bold text-neutral-900 text-xl">{title}</h1>
            <p className="mt-1 text-neutral-500 text-sm">{subtitle}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-3.5 text-gravisima-700 text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-leve-200 bg-leve-50 p-3.5 text-leve-700 text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {mode !== 'update-password' && (
            <div className="mb-4">
              <label
                htmlFor="login-email"
                className="mb-1.5 block font-semibold text-neutral-600 text-xs"
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                aria-label="Correo electrónico"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                type="email"
                placeholder="usuario@colegio.cl"
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 text-sm placeholder-neutral-400 transition-colors duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                name={emailRegistration.name}
                onBlur={emailRegistration.onBlur}
                onChange={emailRegistration.onChange}
                ref={(element) => {
                  emailRegistration.ref(element);
                  emailRef.current = element;
                }}
              />
              <FieldError id="login-email-error" message={errors.email?.message} />
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <PasswordInput
                id="login-password"
                label="Contraseña"
                registration={register('password')}
                error={errors.password?.message}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => changeMode('request-reset')}
                className="block w-full text-right font-medium text-brand-600 text-xs transition-colors hover:text-brand-700"
              >
                ¿Olvidó su contraseña?
              </button>
              <PrimaryButton
                loading={isLoading}
                label="Iniciar sesión"
                loadingLabel="Ingresando..."
              />
            </form>
          )}

          {mode === 'request-reset' && (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <PrimaryButton loading={isLoading} label="Enviar enlace" loadingLabel="Enviando..." />
              <BackButton onClick={() => changeMode('login')} />
            </form>
          )}

          {mode === 'update-password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <PasswordInput
                id="new-password"
                label="Nueva contraseña"
                registration={register('password')}
                error={errors.password?.message}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
              <PasswordInput
                id="confirm-password"
                label="Confirmar contraseña"
                registration={register('passwordConfirmation')}
                error={errors.passwordConfirmation?.message}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
              <PrimaryButton
                loading={isLoading}
                label="Guardar contraseña"
                loadingLabel="Guardando..."
              />
            </form>
          )}
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50 px-8 py-4">
          <p className="text-center text-neutral-600 text-xs">
            Debido Proceso · Sistema de convivencia escolar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-1.5 text-gravisima-700 text-xs">
      {message}
    </p>
  );
}

interface PasswordInputProps {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  visible: boolean;
  autoComplete: string;
  onToggle: () => void;
}

function PasswordInput({
  id,
  label,
  registration,
  error,
  visible,
  autoComplete,
  onToggle,
}: PasswordInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold text-neutral-600 text-xs">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-11 text-neutral-900 text-sm placeholder-neutral-400 transition-colors duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function PrimaryButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <Button
      type="submit"
      fullWidth
      isLoading={loading}
      disabled={loading}
      className="mt-2 rounded-xl px-4 py-3"
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      fullWidth
      onClick={onClick}
      className="rounded-xl px-4 py-2 font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700"
    >
      Volver al inicio de sesión
    </Button>
  );
}
