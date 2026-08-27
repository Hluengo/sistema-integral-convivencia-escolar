/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa, ChecklistItem, FaseProcedimental, UserRole } from '../../shared/lib/types';
import { CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { PROCESS_SECTIONS } from './processSections';
import AttachedDocuments from './AttachedDocuments';
import ChecklistItemCard from './ChecklistItemCard';
import InvestigationChecklist from './InvestigationChecklist';
import CausaNotificationPanel from '../causas/notificacionDocgen/CausaNotificationPanel';
import { getApplicableChecklistItems } from '../../shared/lib/domain/investigationChecklist';

interface ProcessChecklistProps {
  causa: Causa;
  currentRole: UserRole;
  currentFase: string;
  expandedStages: Record<string, boolean>;
  setExpandedStages: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  registeringItemId: string | null;
  setRegisteringItemId: React.Dispatch<React.SetStateAction<string | null>>;
  regName: string;
  setRegName: React.Dispatch<React.SetStateAction<string>>;
  regObservations: string;
  setRegObservations: React.Dispatch<React.SetStateAction<string>>;
  regFileName: string;
  setRegFileName: React.Dispatch<React.SetStateAction<string>>;
  handleStartRegister: (item: ChecklistItem) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRegistration: (itemId: string) => void;
  handleResetRegistration: (itemId: string) => void;
  regFile: File | null;
  isSavingRegistration: boolean;
  registrationError: string | null;
  documentError: string | null;
  handleAttachDocument: (itemId: string, file: File | null) => Promise<void>;
  handleRemoveDocument: (itemId: string, fileName?: string, filePath?: string) => Promise<void>;
  documents: { name: string; url: string; scope: 'causa' | 'incidente' }[];
  selectedPhase: FaseProcedimental;
}

export default function ProcessChecklist({
  causa,
  currentRole,
  currentFase,
  expandedStages,
  setExpandedStages,
  registeringItemId,
  setRegisteringItemId,
  regName,
  setRegName,
  regObservations,
  setRegObservations,
  regFileName,
  setRegFileName: _setRegFileName,
  handleStartRegister,
  handleFileChange,
  handleSaveRegistration,
  handleResetRegistration,
  regFile,
  isSavingRegistration,
  registrationError,
  documentError,
  handleAttachDocument: _handleAttachDocument,
  handleRemoveDocument,
  documents,
  selectedPhase,
}: ProcessChecklistProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-neutral-100 border-b pb-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-sans font-semibold text-neutral-700 text-xs uppercase tracking-wider">
            <CheckSquare className="h-4 w-4 text-success-600" aria-hidden="true" /> Registro de
            hitos procesales
          </h3>
          <p className="mt-0.5 font-sans text-9px text-neutral-400 leading-tight">
            Preserve la trazabilidad del debido proceso
          </p>
        </div>
      </div>

      {/* Accordion of 5 stages */}
      <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
        {PROCESS_SECTIONS.filter((section) => section.phaseName === selectedPhase).map(
          (section) => {
            const sectionItems = getApplicableChecklistItems(causa, section.phaseName);
            const completedCount = sectionItems.filter((item) => item.completado).length;
            const isExpanded = expandedStages[section.id];
            const isActive = currentFase === section.phaseName;

            if (section.phaseName === 'Investigación') {
              return (
                <InvestigationChecklist
                  key={section.id}
                  causa={causa}
                  currentRole={currentRole}
                  expandedStages={expandedStages}
                  setExpandedStages={setExpandedStages}
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
                  isActive={isActive}
                />
              );
            }

            return (
              <div
                key={section.id}
                id={`stage-${section.id}`}
                className={`overflow-hidden rounded-lg border bg-white transition-colors ${isActive ? 'border-brand-300 bg-brand-50/5 ring-1 ring-brand-300/30' : 'border-neutral-200'}`}
              >
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStages({ ...expandedStages, [section.id]: !isExpanded })
                  }
                  className={`flex w-full select-none items-center justify-between p-3 text-left font-sans transition-colors ${
                    isExpanded
                      ? 'border-neutral-200 border-b bg-neutral-50'
                      : 'bg-neutral-50/50 hover:bg-neutral-50'
                  }`}
                  aria-expanded={isExpanded}
                  aria-controls={`section-${section.id}`}
                  aria-label={`${isExpanded ? 'Ocultar' : 'Abrir'} hitos de ${section.title}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`font-semibold text-xs ${completedCount === sectionItems.length ? 'text-success-700' : 'text-neutral-800'}`}
                    >
                      {section.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 font-semibold text-8px ${
                        completedCount === sectionItems.length
                          ? 'bg-success-100 text-success-700'
                          : completedCount > 0
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {completedCount}/{sectionItems.length}
                    </span>
                    <span className="shrink-0 font-mono text-8px text-brand-600 tabular-nums">
                      {sectionItems.length > 0
                        ? Math.round((completedCount / sectionItems.length) * 100)
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
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </span>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div id={`section-${section.id}`} className="space-y-4 p-3">
                    {sectionItems.map((item) => (
                      <ChecklistItemCard
                        key={item.id}
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
                      />
                    ))}
                    {section.phaseName === 'Recepción' && (
                      <section
                        aria-labelledby="notification-workspace-title"
                        className="mt-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4"
                      >
                        <div className="mb-3 border-brand-100 border-b pb-3">
                          <h4
                            id="notification-workspace-title"
                            className="font-semibold text-brand-950 text-sm"
                          >
                            Notificación de inicio de indagación
                          </h4>
                          <p className="mt-1 text-brand-900/70 text-11px">
                            Complete, revise y genere el documento desde un espacio independiente
                            del checklist.
                          </p>
                        </div>
                        <CausaNotificationPanel causa={causa} />
                      </section>
                    )}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {documents.length > 0 && (
        <AttachedDocuments
          documents={documents}
          documentError={documentError}
          onRemoveDocument={handleRemoveDocument}
        />
      )}
    </div>
  );
}
