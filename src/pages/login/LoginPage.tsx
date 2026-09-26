/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import {
  requestPasswordReset,
  signInWithEmail,
  signOut,
  updatePassword,
} from "../../shared/api/services/auth.service";
import {
  type LoginFormValues,
  loginFormSchema,
  passwordResetRequestSchema,
  passwordUpdateFormSchema,
} from "../../shared/lib/schemas/loginForm";
import { useAppContext } from "../../shared/lib/useAppContext";
import { useAuthStore } from "../../shared/lib/stores/authStore";
import { Dialog, DialogContent } from "../../shared/ui/Dialog";
import Button from "../../shared/ui/Button";

interface LoginPageProps {
  onClose?: () => void;
  required?: boolean;
}

type AuthMode = "login" | "request-reset" | "update-password";

type LoginFormField = keyof LoginFormValues;

const LOGIN_FIELD_NAMES: LoginFormField[] = [
  "email",
  "password",
  "passwordConfirmation",
];

function isLoginFormField(field: unknown): field is LoginFormField {
  return (
    typeof field === "string" &&
    LOGIN_FIELD_NAMES.includes(field as LoginFormField)
  );
}

export default function LoginPage({
  onClose,
  required = false,
}: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>(() =>
    typeof window !== "undefined" &&
    window.sessionStorage.getItem("supabase-password-recovery") === "true"
      ? "update-password"
      : "login",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("convivencia-remember-email") === "true",
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setShowLoginModal } = useAppContext();
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const clearSessionExpired = useAuthStore(
    (state) => state.clearSessionExpired,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberedEmail =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("convivencia-login-email") ?? "")
      : "";
  const {
    register,
    setError: setFieldError,
    clearErrors,
    resetField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: rememberedEmail,
      password: "",
      passwordConfirmation: "",
    },
    mode: "onChange",
  });
  const emailRegistration = register("email");

  useEffect(() => {
    if (sessionExpired) {
      setNotice("La sesión expiró. Inicie sesión nuevamente para continuar.");
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
    resetField("password");
    resetField("passwordConfirmation");
    setMode(nextMode);
  };

  const applyValidationIssues = (
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    for (const issue of issues) {
      const [field] = issue.path;
      if (isLoginFormField(field)) {
        setFieldError(field, { type: "validate", message: issue.message });
      }
    }
  };

  const handleLogin = handleSubmit(async (values) => {
    const parsed = loginFormSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationIssues(parsed.error.issues);
      setError("Revise los datos de inicio de sesión.");
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      const { email, password } = parsed.data;
      const { error: authError } = await signInWithEmail(
        email.trim(),
        password,
      );
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Credenciales incorrectas. Verifique su email y contraseña."
            : authError.message,
        );
        return;
      }
      if (typeof window !== "undefined") {
        if (rememberEmail) {
          window.localStorage.setItem("convivencia-login-email", email.trim());
          window.localStorage.setItem("convivencia-remember-email", "true");
        } else {
          window.localStorage.removeItem("convivencia-login-email");
          window.localStorage.removeItem("convivencia-remember-email");
        }
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
      setError("Ingrese un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    resetMessages();
    try {
      const { error: authError } = await requestPasswordReset(
        parsed.data.email.trim(),
      );
      if (authError) {
        setError(authError.message);
        return;
      }
      setNotice(
        "Si la cuenta existe, recibirá un correo con el enlace para crear una contraseña nueva.",
      );
    } finally {
      setIsLoading(false);
    }
  });

  const handlePasswordUpdate = handleSubmit(async (values) => {
    const parsed = passwordUpdateFormSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationIssues(parsed.error.issues);
      setError("Revise la nueva contraseña.");
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
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("supabase-password-recovery");
      }
      clearSessionExpired();
      await signOut();
      resetField("password");
      resetField("passwordConfirmation");
      setMode("login");
      setNotice("Contraseña actualizada. Ya puede iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  });

  const title =
    mode === "login"
      ? "Iniciar sesión"
      : mode === "request-reset"
        ? "Recuperar contraseña"
        : "Crear nueva contraseña";

  const subtitle =
    mode === "login"
      ? "Acceda para gestionar expedientes"
      : mode === "request-reset"
        ? "Le enviaremos un enlace seguro a su correo"
        : "Ingrese y confirme su nueva contraseña";

  return (
    <Dialog
      open
      onOpenChange={(open: boolean) => {
        if (!open && mode !== "update-password" && !required) {
          setShowLoginModal(false);
          onClose?.();
        }
      }}
    >
      <DialogContent
        hideClose={required}
        className="max-w-[800px] overflow-hidden p-0"
        style={{ maxWidth: "800px" }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          if (mode !== "update-password") emailRef.current?.focus();
        }}
      >
        <div className="h-1 w-full bg-linear-to-r from-brand-500 via-brand-600 to-brand-700" />
        <div className="grid md:grid-cols-[0.85fr_1.15fr]">
          <aside
            aria-hidden="true"
            className="relative hidden min-h-[520px] overflow-hidden bg-brand-700 p-8 text-white md:flex md:flex-col md:justify-between"
          >
            <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full border-[24px] border-white/10" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-500/40" />
            <div className="relative">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <span className="h-7 w-7 rounded-full border-2 border-white/80" />
              </div>
              <p className="font-semibold text-brand-100 text-xs uppercase tracking-[0.18em]">
                Gestión Integral
              </p>
              <p className="mt-3 max-w-[16rem] font-bold text-2xl leading-tight tracking-tight">
                Acompañar también es convivir.
              </p>
            </div>
            <p className="relative max-w-[15rem] text-brand-100 text-sm leading-6">
              Un espacio para ordenar antecedentes, acuerdos y seguimientos de
              cada expediente escolar.
            </p>
          </aside>

          <div className="p-8 pb-7 sm:p-10 sm:pb-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
                <img
                  src="/logo.svg"
                  alt="Escudo Veritas"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-brand-700 text-sm tracking-wide">
                  Convivencia Escolar
                </p>
                <p className="mt-0.5 text-neutral-500 text-xs">
                  Gestión y acompañamiento institucional
                </p>
              </div>
            </div>

            <div className="mb-7">
              <h1 className="font-bold text-neutral-900 text-2xl tracking-tight">
                {title}
              </h1>
              <p className="mt-2 max-w-sm text-neutral-600 text-sm leading-6">
                {mode === "login"
                  ? "Ingrese para gestionar expedientes de su comunidad escolar."
                  : subtitle}
              </p>
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

            {mode !== "update-password" && (
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
                  aria-describedby={
                    errors.email ? "login-email-error" : undefined
                  }
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
                <FieldError
                  id="login-email-error"
                  message={errors.email?.message}
                />
              </div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <PasswordInput
                  id="login-password"
                  label="Contraseña"
                  registration={register("password")}
                  error={errors.password?.message}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                  autoComplete="current-password"
                />
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="remember-email"
                    className="flex cursor-pointer items-center gap-2 text-neutral-600 text-xs"
                  >
                    <input
                      id="remember-email"
                      aria-label="Recordar mi correo"
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(event) =>
                        setRememberEmail(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                    />
                    Recordar mi correo
                  </label>
                  <button
                    type="button"
                    onClick={() => changeMode("request-reset")}
                    className="font-medium text-brand-600 text-xs transition-colors hover:text-brand-700"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>
                <PrimaryButton
                  loading={isLoading}
                  label="Iniciar sesión"
                  loadingLabel="Ingresando..."
                />
              </form>
            )}

            {mode === "request-reset" && (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <PrimaryButton
                  loading={isLoading}
                  label="Enviar enlace"
                  loadingLabel="Enviando..."
                />
                <BackButton onClick={() => changeMode("login")} />
              </form>
            )}

            {mode === "update-password" && (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <PasswordInput
                  id="new-password"
                  label="Nueva contraseña"
                  registration={register("password")}
                  error={errors.password?.message}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                  autoComplete="new-password"
                />
                <PasswordInput
                  id="confirm-password"
                  label="Confirmar contraseña"
                  registration={register("passwordConfirmation")}
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
      <label
        htmlFor={id}
        className="mb-1.5 block font-semibold text-neutral-600 text-xs"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-11 text-neutral-900 text-sm placeholder-neutral-400 transition-colors duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-2.5 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
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
