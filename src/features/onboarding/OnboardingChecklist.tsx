/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, ListChecks, X } from 'lucide-react';
import type { SidebarView } from '../../components/Sidebar';
import Button from '../../shared/ui/Button';
import {
  getOnboardingStorageKey,
  readOnboardingState,
  writeOnboardingState,
  type OnboardingState,
  type OnboardingStepId,
} from './onboarding';
import type { OnboardingStatus } from '../../shared/api/services/institution.service';

interface OnboardingChecklistProps {
  tenantId: string;
  userId: string;
  coursesCount: number;
  readiness?: OnboardingStatus;
  onNavigate: (view: SidebarView) => void;
}

interface StepDefinition {
  id: OnboardingStepId;
  label: string;
  description: string;
  view?: SidebarView;
}

const STEPS: StepDefinition[] = [
  {
    id: 'profile',
    label: 'Configurar perfil institucional',
    description: 'Revisa los datos del establecimiento y de tu cuenta.',
    view: 'admin',
  },
  {
    id: 'courses',
    label: 'Revisar cursos',
    description: 'Confirma que los cursos del establecimiento estén disponibles.',
    view: 'alumnos',
  },
  {
    id: 'templates',
    label: 'Crear o revisar plantillas',
    description: 'Asegura que las plantillas institucionales estén listas.',
    view: 'informes',
  },
  {
    id: 'members',
    label: 'Invitar usuarios',
    description: 'Incorpora a las personas que participarán en la gestión.',
    view: 'admin',
  },
  {
    id: 'rules',
    label: 'Confirmar reglas de convivencia',
    description: 'Verifica que las reglas institucionales estén alineadas con tu reglamento.',
    view: 'admin',
  },
];

export default function OnboardingChecklist({
  tenantId,
  userId,
  coursesCount,
  readiness,
  onNavigate,
}: OnboardingChecklistProps) {
  const storageKey = useMemo(() => getOnboardingStorageKey(tenantId, userId), [tenantId, userId]);
  const [state, setState] = useState<OnboardingState>(() => readOnboardingState(storageKey));
  const [expanded, setExpanded] = useState(true);
  const isReady = (step: OnboardingStepId) =>
    state.completed[step] || (readiness ? readiness[step] : step === 'courses' && coursesCount > 0);
  const completed = STEPS.filter((step) => isReady(step.id)).length;
  const isComplete = completed === STEPS.length;

  const updateState = (next: OnboardingState) => {
    setState(next);
    writeOnboardingState(storageKey, next);
  };

  if (state.dismissed && !expanded) return null;

  return (
    <section className="card overflow-hidden border-brand-100 bg-linear-to-br from-brand-50/80 via-white to-white">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-600 p-2.5 text-white shadow-sm">
            <ListChecks className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-brand-700 text-xs uppercase tracking-[0.14em]">
              Inicio guiado
            </p>
            <h2 className="mt-1 font-bold text-neutral-900 text-lg">
              Deja tu establecimiento listo
            </h2>
            <p className="mt-1 max-w-xl text-neutral-600 text-sm">
              Completa estas tareas iniciales para comenzar a trabajar con una configuración clara.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateState({ ...state, dismissed: true })}
          className="self-end rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700 sm:self-start"
          aria-label="Ocultar inicio guiado"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="border-neutral-200/70 border-t px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-neutral-700">
            {completed} de {STEPS.length} tareas completadas
          </span>
          <span className="font-semibold text-brand-700">
            {Math.round((completed / STEPS.length) * 100)}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${(completed / STEPS.length) * 100}%` }}
          />
        </div>

        {isComplete ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-leve-200 bg-leve-50 px-4 py-3">
            <div className="flex items-center gap-2 text-leve-700 text-sm">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span className="font-semibold">Configuración inicial completada.</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setExpanded((value) => !value)}
              className="rounded-lg px-3 py-1.5 text-xs"
            >
              {expanded ? 'Ocultar tareas' : 'Revisar tareas'}
            </Button>
          </div>
        ) : null}

        {expanded && (
          <div className="mt-4 grid gap-2">
            {STEPS.map((step) => {
              const isStepComplete = Boolean(isReady(step.id));
              return (
                <div
                  key={step.id}
                  className={`flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${isStepComplete ? 'border-leve-200 bg-leve-50/60' : 'border-neutral-200 bg-white'}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateState({
                        ...state,
                        completed: { ...state.completed, [step.id]: !isStepComplete },
                      })
                    }
                    className="flex min-w-0 items-start gap-3 text-left"
                  >
                    {isStepComplete ? (
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-leve-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 size-5 shrink-0 text-neutral-300"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      <span className="block font-semibold text-neutral-800 text-sm">
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-neutral-500 text-xs">
                        {step.description}
                      </span>
                    </span>
                  </button>
                  {step.view && (
                    <Button
                      variant="ghost"
                      onClick={() => onNavigate(step.view as SidebarView)}
                      className="self-start rounded-lg px-3 py-1.5 text-xs sm:self-center"
                    >
                      Revisar <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
