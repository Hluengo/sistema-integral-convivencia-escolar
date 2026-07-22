/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/src/stores/authStore';
import { track } from '@/src/lib/analytics';

const STORAGE_KEY = 'onboarding_completed_v1';

interface Step {
  title: string;
  description: string;
  icon: string;
}

const STEPS: Step[] = [
  {
    title: 'Bienvenido a Gestión de Casos',
    description:
      'Plataforma integral para la gestión de convivencia escolar. Aquí podrás registrar anotaciones, dar seguimiento a casos y generar documentos oficiales alineados a la Circular 482 y Ley 21809.',
    icon: '🎓',
  },
  {
    title: 'Panel y Búsqueda',
    description:
      'Usa el panel lateral para navegar entre el Dashboard (vista general) y Causas (casos activos). La barra superior te permite buscar estudiantes, causas o cursos con Ctrl+K.',
    icon: '🔍',
  },
  {
    title: 'Gestión de Causas',
    description:
      'Crea una nueva causa desde el botón "+". Cada causa sigue el debido proceso: bitácora, checklist de auditoría, documentos descargables (amonestación, compromiso, derivación) y asesoría IA.',
    icon: '📋',
  },
  {
    title: 'Documentos e IA',
    description:
      'Genera documentos oficiales desde la línea de tiempo de cada causa. Usa el Asesor IA para mejorar redacción de anotaciones y auditar el debido proceso automáticamente.',
    icon: '🤖',
  },
];

function isCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* noop */
  }
}

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.authLoading);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && !isCompleted()) {
      const timer = setTimeout(() => {
        dialogRef.current?.showModal();
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading]);

  const handleClose = useCallback(() => {
    dialogRef.current?.close();
    setIsOpen(false);
    markCompleted();
    track('feature_used', { feature: 'onboarding_tour' });
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [step, handleClose]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!isOpen) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      aria-label="Tour de primeros pasos"
    >
      <div>
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-neutral-100">
          <div
            className="h-full bg-linear-to-r from-brand-500 to-secondary-500 transition-colors duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 pt-7 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl">
              {currentStep.icon}
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Cerrar tour"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div>
            <h2 className="font-bold text-neutral-800 text-xl leading-tight">
              {currentStep.title}
            </h2>
            <p className="mt-3 text-neutral-600 text-sm leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                  i === step
                    ? 'w-6 bg-brand-600'
                    : i < step
                      ? 'bg-brand-300'
                      : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={isFirst ? handleSkip : handlePrev}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isFirst
                  ? 'text-neutral-400 hover:text-neutral-600'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {!isFirst && <ChevronLeft className="h-4 w-4" />}
              {isFirst ? 'Saltar' : 'Anterior'}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white text-sm transition-colors hover:bg-brand-700"
            >
              {isLast ? (
                <>
                  Comenzar
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
