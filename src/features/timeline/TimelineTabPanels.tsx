/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileStack,
  ListChecks,
} from "lucide-react";
import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import ProcesoTab from "./ProcesoTab";
import BitacoraTab from "./BitacoraTab";
import ResumenTab from "./ResumenTab";
import RutaExpedienteTab from "./RutaExpedienteTab";
import ExpedienteExportPanel from "../causas/expediente/ExpedienteExportPanel";
import MatrizPanel from "../causas/matriz/MatrizPanel";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import { useTimelineContext } from "../../shared/lib/useTimelineContext";
import type { TimelineTab } from "./timelineTabs.types";
import { DetailModalBody } from "../../shared/ui/DetailModal";

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
  const operationalSummary = getCausaOperationalSummary(causa);
  const faseOrder: FaseProcedimental[] = [
    "Recepción",
    "Investigación",
    "Resolución",
    "Apelación",
    "Seguimiento",
  ];

  return (
    <DetailModalBody className="space-y-4 bg-neutral-50/60">
      {activeTab === "resumen" && (
        <ResumenTab
          causa={causa}
          breaches={breaches}
          privacyMode={ctx.privacyMode}
        />
      )}

      {activeTab === "ruta" &&
        (selectedPhase ? (
          <section
            id="phase-workspace"
            aria-labelledby="phase-workspace-title"
            className="space-y-3"
          >
            <nav
              aria-label="Ruta del expediente"
              className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
            >
              {faseOrder.map((fase, idx) => {
                const phaseData = operationalSummary.phaseProgress.find(
                  (p) => p.phase === fase,
                );
                const isComplete = phaseData
                  ? phaseData.completed === phaseData.total &&
                    phaseData.total > 0
                  : false;
                const isCurrent = fase === selectedPhase;
                const isPast =
                  faseOrder.indexOf(selectedPhase as FaseProcedimental) > idx;
                return (
                  <span key={fase} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-slate-300">›</span>}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                        isCurrent
                          ? "bg-brand-600 text-white"
                          : isComplete || isPast
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Circle className="size-3" />
                      )}
                      {fase}
                    </span>
                  </span>
                );
              })}
            </nav>
            <header className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className="rounded-lg bg-brand-100 p-1.5 text-brand-700"
                  aria-hidden="true"
                >
                  <ListChecks className="size-4.5" />
                </span>
                <div>
                  <p className="font-semibold text-10px uppercase tracking-wide text-slate-500">
                    Fase de trabajo
                  </p>
                  <h3
                    id="phase-workspace-title"
                    className="font-semibold text-base text-slate-900"
                  >
                    {selectedPhase}
                  </h3>
                  {(() => {
                    const phaseData = operationalSummary.phaseProgress.find(
                      (p) => p.phase === selectedPhase,
                    );
                    if (!phaseData)
                      return (
                        <p className="mt-0.5 text-xs text-slate-600">
                          Registra y consulta los hitos, antecedentes y
                          documentos de esta fase.
                        </p>
                      );
                    const pct =
                      phaseData.total > 0
                        ? Math.round(
                            (phaseData.completed / phaseData.total) * 100,
                          )
                        : 0;
                    const nextItem =
                      operationalSummary.nextChecklistItem &&
                      operationalSummary.nextChecklistPhase === selectedPhase
                        ? operationalSummary.nextChecklistItem.label
                        : null;
                    return (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {phaseData.completed}/{phaseData.total} hitos · {pct}%
                        {nextItem ? ` · Falta: ${nextItem}` : ""}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectPhase(null)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <ArrowLeft className="size-3.5" />
                Volver a la ruta
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

      {activeTab === "matriz" && (
        <section aria-labelledby="matriz-title" className="space-y-3">
          <header className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
            <span
              className="rounded-lg bg-brand-100 p-1.5 text-brand-700"
              aria-hidden="true"
            >
              <FileStack className="size-4" />
            </span>
            <div>
              <h3
                id="matriz-title"
                className="font-semibold text-sm text-slate-900"
              >
                Matriz Hecho–Evidencia–RICE
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Cada hecho acreditado debe tener evidencia y norma RICE. Soporta
                casos colectivos vía incidente compartido.
              </p>
            </div>
          </header>
          <MatrizPanel causa={causa} />
        </section>
      )}

      {activeTab === "bitacora" && (
        <BitacoraTab
          causa={causa}
          currentRole={ctx.currentRole}
          onCreateManualEntry={ctx.createManualLog}
          isSavingManualEntry={ctx.isCreatingManualLog}
          manualEntryError={ctx.manualLogError}
          onResetManualEntryError={ctx.resetManualLogError}
        />
      )}

      {activeTab === "expediente" && (
        <section aria-labelledby="expediente-title" className="space-y-3">
          <header className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-white p-3">
            <span
              className="rounded-lg bg-brand-100 p-1.5 text-brand-700"
              aria-hidden="true"
            >
              <Download className="size-4" />
            </span>
            <div>
              <h3
                id="expediente-title"
                className="font-semibold text-neutral-900 text-sm"
              >
                Descargar expediente completo
              </h3>
              <p className="mt-0.5 text-neutral-600 text-xs">
                PDF imprimible, Markdown para IA y ZIP con los documentos
                subidos. Cada descarga queda registrada en la bitácora.
              </p>
            </div>
          </header>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <ExpedienteExportPanel causa={causa} />
          </div>
        </section>
      )}
    </DetailModalBody>
  );
}
