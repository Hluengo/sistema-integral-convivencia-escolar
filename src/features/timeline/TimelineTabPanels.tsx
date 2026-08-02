/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, ListChecks } from 'lucide-react';
import type { Causa, FaseProcedimental } from '../../shared/lib/types';
import ProcesoTab from './ProcesoTab';
import BitacoraTab from './BitacoraTab';
import ResumenTab from './ResumenTab';
import RutaExpedienteTab from './RutaExpedienteTab';
import { useTimelineContext } from '../../shared/lib/useTimelineContext';
import type { TimelineTab } from './timelineTabs.types';
import { DetailModalBody } from '../../shared/ui/DetailModal';

interface TimelineTabPanelsProps {
  activeTab: TimelineTab;
  causa: Causa;
  currentFase: string;
  breaches: string[];
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

export default function TimelineTabPanels({
  activeTab,
  causa,
  currentFase,
  breaches,
  selectedPhase,
  onSelectPhase,
}: TimelineTabPanelsProps) {
  const ctx = useTimelineContext();

  return (
    <DetailModalBody className="space-y-4">
      {activeTab === 'resumen' && <ResumenTab causa={causa} breaches={breaches} />}

      {activeTab === 'ruta' &&
        (selectedPhase ? (
          <section
            id="phase-workspace"
            aria-labelledby="phase-workspace-title"
            className="space-y-4"
          >
            <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="rounded-lg bg-brand-100 p-2 text-brand-700" aria-hidden="true">
                  <ListChecks className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
                    Fase de trabajo
                  </p>
                  <h3 id="phase-workspace-title" className="font-semibold text-neutral-900 text-lg">
                    {selectedPhase}
                  </h3>
                  <p className="mt-0.5 text-neutral-600 text-sm">
                    Registra y consulta los hitos, antecedentes y documentos de esta fase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectPhase(null)}
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2 font-semibold text-brand-800 text-sm shadow-xs transition hover:border-brand-300 hover:bg-brand-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <span
                  className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-white transition group-hover:-translate-x-0.5"
                  aria-hidden="true"
                >
                  <ArrowLeft className="size-3.5" />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span>Volver a la ruta</span>
                  <span className="mt-0.5 font-medium text-[10px] text-brand-700">
                    Ver las 5 fases
                  </span>
                </span>
              </button>
            </header>
            <ProcesoTab
              causa={causa}
              currentRole={ctx.currentRole}
              currentFase={currentFase}
              expandedStages={ctx.expandedStages}
              setExpandedStages={ctx.setExpandedStages}
              registeringItemId={ctx.registeringItemId}
              setRegisteringItemId={ctx.setRegisteringItemId}
              regName={ctx.regName}
              setRegName={ctx.setRegName}
              regObservations={ctx.regObservations}
              setRegObservations={ctx.setRegObservations}
              regFileName={ctx.regFileName}
              setRegFileName={ctx.setRegFileName}
              handleStartRegister={ctx.handleStartRegister}
              handleFileChange={ctx.handleFileChange}
              handleSaveRegistration={ctx.handleSaveRegistration}
              handleResetRegistration={ctx.handleResetRegistration}
              regFile={ctx.regFile}
              isSavingRegistration={ctx.isSavingRegistration}
              registrationError={ctx.registrationError}
              documentError={ctx.documentError}
              handleAttachDocument={ctx.handleAttachDocument}
              handleRemoveDocument={ctx.handleRemoveDocument}
              documents={ctx.documents}
              selectedPhase={selectedPhase}
            />
          </section>
        ) : (
          <RutaExpedienteTab
            causa={causa}
            selectedPhase={selectedPhase}
            onSelectPhase={onSelectPhase}
          />
        ))}

      {activeTab === 'bitacora' && (
        <BitacoraTab
          causa={causa}
          currentRole={ctx.currentRole}
          onCreateManualEntry={ctx.createManualLog}
        />
      )}
    </DetailModalBody>
  );
}
