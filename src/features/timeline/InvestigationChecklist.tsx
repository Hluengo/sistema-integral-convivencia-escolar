/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { Causa, ChecklistItem, UserRole } from '../../shared/lib/types';
import { getInvestigationChecklistModel } from '../../shared/lib/domain/investigationChecklist';
import ChecklistItemCard from './ChecklistItemCard';
import RegistrationForm from './RegistrationForm';
import ChecklistProgressPanel from './ChecklistProgressPanel';

interface InvestigationChecklistProps {
  causa: Causa;
  currentRole: UserRole;
  expandedStages: Record<string, boolean>;
  setExpandedStages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  registeringItemId: string | null;
  setRegisteringItemId: React.Dispatch<React.SetStateAction<string | null>>;
  regName: string;
  setRegName: React.Dispatch<React.SetStateAction<string>>;
  regObservations: string;
  setRegObservations: React.Dispatch<React.SetStateAction<string>>;
  regFileName: string;
  regFile: File | null;
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => void;
  handleResetRegistration: (itemId: string) => void;
  isSavingRegistration: boolean;
  registrationError: string | null;
  isActive: boolean;
}

export default function InvestigationChecklist({
  causa,
  currentRole,
  expandedStages,
  setExpandedStages,
  registeringItemId,
  setRegisteringItemId,
  regName,
  setRegName,
  regObservations,
  setRegObservations,
  regFileName,
  regFile,
  handleStartRegister,
  handleFileChange,
  handleSaveRegistration,
  handleResetRegistration,
  isSavingRegistration,
  registrationError,
  isActive,
}: InvestigationChecklistProps) {
  const model = getInvestigationChecklistModel(causa);
  const isExpanded = expandedStages.investigacion;
  const canRegister = currentRole !== 'docente';
  const derivationItem = model.mediationFlowItems.find((item) => item.id === 'chk_inv_3') ?? null;
  const renderInvestigationItem = (item: ChecklistItem, notRequired = false) => (
    <div key={item.id}>
      <ChecklistItemCard
        causa={causa}
        currentRole={currentRole}
        item={item}
        registeringItemId={registeringItemId}
        setRegisteringItemId={setRegisteringItemId}
        regName={regName}
        setRegName={setRegName}
        regObservations={regObservations}
        setRegObservations={setRegObservations}
        regFileName={regFileName}
        regFile={regFile}
        handleStartRegister={handleStartRegister}
        handleFileChange={handleFileChange}
        handleSaveRegistration={handleSaveRegistration}
        handleResetRegistration={handleResetRegistration}
        isSavingRegistration={isSavingRegistration}
        registrationError={registrationError}
        notRequired={notRequired}
      />
      {!notRequired && (
        <ChecklistProgressPanel
          causaId={causa.id}
          incidenteId={causa.incidenteId}
          item={item}
          canRegister={canRegister}
        />
      )}
    </div>
  );

  return (
    <div
      id="stage-investigacion"
      className={`overflow-hidden rounded-lg border bg-white transition-colors ${
        isActive ? 'border-brand-300 bg-brand-50/5 ring-1 ring-brand-300/30' : 'border-neutral-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpandedStages({ ...expandedStages, investigacion: !isExpanded })}
        className={`flex w-full select-none items-center justify-between p-3 text-left font-sans transition-colors ${
          isExpanded
            ? 'border-neutral-200 border-b bg-neutral-50'
            : 'bg-neutral-50/50 hover:bg-neutral-50'
        }`}
        aria-expanded={isExpanded}
        aria-controls="section-investigacion"
        aria-label={`${isExpanded ? 'Ocultar' : 'Abrir'} hitos de Investigación`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`font-semibold text-xs ${
              model.progress.total > 0 && model.progress.completed === model.progress.total
                ? 'text-success-700'
                : 'text-neutral-800'
            }`}
          >
            2. Investigación
          </span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 font-semibold text-8px ${
              model.progress.total > 0 && model.progress.completed === model.progress.total
                ? 'bg-success-100 text-success-700'
                : model.progress.completed > 0
                  ? 'bg-warning-100 text-warning-700'
                  : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {model.progress.completed}/{model.progress.total}
          </span>
          <span className="shrink-0 font-mono text-8px text-brand-600 tabular-nums">
            {model.progress.total > 0
              ? Math.round((model.progress.completed / model.progress.total) * 100)
              : 0}
            %
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={`hidden rounded-full px-2 py-1 font-bold text-9px sm:inline ${
              isExpanded ? 'bg-brand-100 text-brand-800' : 'bg-brand-600 text-white'
            }`}
          >
            {isExpanded ? 'Ocultar hitos' : 'Abrir hitos'}
          </span>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-xs transition-all ${
              isExpanded
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-brand-500 bg-brand-50 text-brand-700 hover:scale-105 hover:bg-brand-600 hover:text-white'
            }`}
            aria-hidden="true"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </span>
      </button>

      {isExpanded && (
        <div id="section-investigacion" className="space-y-5 p-3">
          <section className="space-y-4" aria-labelledby="investigation-base-title">
            <h4
              id="investigation-base-title"
              className="font-semibold text-neutral-700 text-11px uppercase tracking-wide"
            >
              Investigación
            </h4>
            {model.baseItems.map((item) => renderInvestigationItem(item))}
          </section>

          <section
            className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/40 p-3"
            aria-labelledby="mediation-subflow-title"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 id="mediation-subflow-title" className="font-semibold text-neutral-900 text-xs">
                  Mediación
                </h4>
                <p className="mt-0.5 text-neutral-600 text-10px leading-snug">
                  Instancia opcional para aquellos casos en que corresponda una estrategia
                  restaurativa o colaborativa.
                </p>
              </div>
              {!model.mediationActive && (
                <span className="w-fit rounded-full bg-neutral-100 px-2 py-1 font-semibold text-9px text-neutral-600">
                  Mediación no requerida
                </span>
              )}
            </div>

            {!model.mediationActive && derivationItem && (
              <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-neutral-700 text-xs">Mediación no requerida</p>
                  {canRegister && (
                    <button
                      type="button"
                      onClick={() => handleStartRegister(derivationItem)}
                      className="inline-flex w-fit items-center gap-1.5 rounded border border-sky-200 bg-white px-2.5 py-1 font-semibold text-11px text-sky-700 transition-colors hover:bg-sky-50"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Derivar a mediación
                    </button>
                  )}
                </div>
                {registeringItemId === derivationItem.id && (
                  <RegistrationForm
                    item={derivationItem}
                    regName={regName}
                    setRegName={setRegName}
                    regFileName={regFileName}
                    regObservations={regObservations}
                    setRegObservations={setRegObservations}
                    regFile={regFile}
                    handleFileChange={handleFileChange}
                    onCancel={() => setRegisteringItemId(null)}
                    onSubmit={() => {
                      handleSaveRegistration(derivationItem.id);
                    }}
                    isSaving={isSavingRegistration}
                    errorMessage={registrationError}
                  />
                )}
              </div>
            )}

            {model.mediationActive && (
              <div className="space-y-2">
                {model.mediationFlowItems.map((item) => renderInvestigationItem(item))}

                <div className="space-y-2 pt-1">
                  <p className="font-semibold text-neutral-700 text-11px uppercase tracking-wide">
                    Resultado
                  </p>
                  {model.agreementItem && (
                    <ChecklistItemCard
                      causa={causa}
                      currentRole={currentRole}
                      item={model.agreementItem}
                      registeringItemId={registeringItemId}
                      setRegisteringItemId={setRegisteringItemId}
                      regName={regName}
                      setRegName={setRegName}
                      regObservations={regObservations}
                      setRegObservations={setRegObservations}
                      regFileName={regFileName}
                      regFile={regFile}
                      handleStartRegister={handleStartRegister}
                      handleFileChange={handleFileChange}
                      handleSaveRegistration={handleSaveRegistration}
                      handleResetRegistration={handleResetRegistration}
                      isSavingRegistration={isSavingRegistration}
                      registrationError={registrationError}
                      notRequired={model.mediationOutcome === 'failed'}
                    />
                  )}
                  {model.failedItem && (
                    <ChecklistItemCard
                      causa={causa}
                      currentRole={currentRole}
                      item={model.failedItem}
                      registeringItemId={registeringItemId}
                      setRegisteringItemId={setRegisteringItemId}
                      regName={regName}
                      setRegName={setRegName}
                      regObservations={regObservations}
                      setRegObservations={setRegObservations}
                      regFileName={regFileName}
                      regFile={regFile}
                      handleStartRegister={handleStartRegister}
                      handleFileChange={handleFileChange}
                      handleSaveRegistration={handleSaveRegistration}
                      handleResetRegistration={handleResetRegistration}
                      isSavingRegistration={isSavingRegistration}
                      registrationError={registrationError}
                      notRequired={model.mediationOutcome === 'agreement'}
                    />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
