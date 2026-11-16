/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Upload } from "lucide-react";
import type {
  Causa,
  ChecklistItem,
  FaseProcedimental,
} from "../../shared/lib/types";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import { getApplicableChecklistItems } from "../../shared/lib/domain/investigationChecklist";
import { getPhaseTone } from "../../shared/lib/domain/phaseTones";
import CausaNotificationPanel from "../causas/notificacionDocgen/CausaNotificationPanel";
import RegistrationForm from "./RegistrationForm";
import RutaYoloPhaseRail from "./RutaYoloPhaseRail";
import RutaYoloDocumentPreview from "./RutaYoloDocumentPreview";
import RutaYoloEvidenceThread from "./RutaYoloEvidenceThread";
import HistoryEntryForm from "../../shared/ui/HistoryEntryForm";
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_PLACEHOLDER,
} from "../../shared/api/services/storage.service";
import { useSessionDraftKey } from "../../shared/lib/hooks/useSessionDraftKey";
import { useTimelineContext } from "../../shared/lib/useTimelineContext";
import {
  openDocument,
  getDocumentUrl,
} from "../../shared/api/services/storage.service";

interface RutaYoloViewProps {
  causa: Causa;
  currentFase: string;
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

function defaultItem(items: ChecklistItem[]) {
  return (
    items.find((item) => item.id === "chk_rec_3")?.id ?? items[0]?.id ?? null
  );
}

export default function RutaYoloView({
  causa,
  currentFase,
  selectedPhase,
  onSelectPhase,
}: RutaYoloViewProps) {
  const summary = getCausaOperationalSummary(causa);
  const activePhase = selectedPhase ?? (currentFase as FaseProcedimental);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<FaseProcedimental | null>(
    null,
  );
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isDocumentExpanded, setIsDocumentExpanded] = useState(false);
  const evidenceDraftKey = useSessionDraftKey("additional-evidence", causa.id);
  const [evidenceSelection, setEvidenceSelection] = useState<{
    key: string | null;
    file: File;
  } | null>(null);
  const additionalEvidenceFile =
    evidenceSelection?.key === evidenceDraftKey
      ? evidenceSelection?.file
      : null;
  const {
    currentRole,
    registeringItemId,
    setRegisteringItemId,
    regName,
    setRegName,
    regObservations,
    setRegObservations,
    regFileName,
    regFile,
    regText,
    setRegText,
    regActionDate,
    setRegActionDate,
    handleStartRegister,
    handleFileChange,
    handleSaveRegistration,
    isSavingRegistration,
    registrationError,
    createManualLog,
    isCreatingManualLog,
    manualLogError,
    resetManualLogError,
  } = useTimelineContext();

  const phaseItems = useMemo(
    () => getApplicableChecklistItems(causa, activePhase),
    [activePhase, causa],
  );
  const selectedItem =
    phaseItems.find((item) => item.id === selectedItemId) ?? null;
  const evidenceEntries = useMemo(
    () =>
      selectedItem?.id === "chk_inv_2"
        ? causa.bitacora
            .filter(
              (entry) =>
                entry.tipo === "Evidencia" ||
                entry.titulo === `Registro de Hito: ${selectedItem.label}` ||
                entry.titulo === `Rectificación de Hito: ${selectedItem.label}`,
            )
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
        : [],
    [causa.bitacora, selectedItem?.id, selectedItem?.label],
  );
  const isNotification = selectedItem?.id === "chk_rec_3";
  const isEditing = selectedItem
    ? registeringItemId === selectedItem.id
    : false;
  const activePhaseIndex = Math.max(
    0,
    summary.phaseProgress.findIndex((phase) => phase.phase === activePhase),
  );

  useEffect(() => {
    setSelectedItemId((current) =>
      current && phaseItems.some((item) => item.id === current)
        ? current
        : defaultItem(phaseItems),
    );
  }, [phaseItems]);

  useEffect(() => {
    let cancelled = false;
    setIsDocumentExpanded(false);
    setPdfUrl(null);
    if (
      !selectedItem?.documentoUrl ||
      !/\.pdf(?:$|[?#])/i.test(selectedItem.documentoUrl)
    ) {
      return;
    }
    setIsLoadingPdf(true);
    void getDocumentUrl(selectedItem.documentoUrl).then((url) => {
      if (!cancelled) {
        setPdfUrl(url);
        setIsLoadingPdf(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedItem?.documentoUrl]);

  const selectPhase = (phase: FaseProcedimental) => {
    onSelectPhase(phase);
    setExpandedPhase((current) => (current === phase ? null : phase));
    const items = getApplicableChecklistItems(causa, phase);
    setSelectedItemId(defaultItem(items));
  };

  const deadlineExpiryTitle = "Plazo Vencido sin Reconsideración o Apelación";
  const deadlineExpiryRegistered = causa.bitacora.some(
    (entry) => entry.titulo === deadlineExpiryTitle,
  );
  const registerDeadlineExpiry = async () => {
    resetManualLogError();
    await createManualLog({
      title: deadlineExpiryTitle,
      description:
        "Se registra el vencimiento del plazo sin presentación de solicitud.",
      type: "Otro",
      participants: "Equipo de Convivencia Escolar",
    });
  };

  return (
    <>
      <div className="card flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
        <span className="font-bold uppercase tracking-wide text-neutral-500">
          Etapas del debido proceso
        </span>
        <span className="rounded bg-brand-50 px-2 py-1 font-semibold text-brand-700">
          Circular 482 / Ley 20.529
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
          {summary.phaseProgress.map((phase, index) => {
            const phaseName = phase.phase as FaseProcedimental;
            const active = phaseName === activePhase;
            const tone = getPhaseTone(phaseName);
            return (
              <button
                key={phase.phase}
                type="button"
                onClick={() => selectPhase(phaseName)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-semibold transition ${active ? `${tone.solid} text-white` : "text-neutral-500 hover:bg-neutral-100"}`}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[9px] ${active ? "bg-white/20" : "bg-neutral-100"}`}
                >
                  {index + 1}
                </span>
                {phase.phase}
              </button>
            );
          })}
        </div>
      </div>
      <div className="card grid min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)]">
        <RutaYoloPhaseRail
          causa={causa}
          phaseProgress={summary.phaseProgress}
          currentPhase={summary.currentPhase}
          activePhase={activePhase}
          activePhaseIndex={activePhaseIndex}
          phaseItems={phaseItems}
          expandedPhase={expandedPhase}
          selectedItemId={selectedItemId}
          currentRole={currentRole}
          onSelectPhase={selectPhase}
          onSelectItem={setSelectedItemId}
          deadlineExpiryRegistered={deadlineExpiryRegistered}
          isCreatingManualLog={isCreatingManualLog}
          manualLogError={manualLogError}
          onRegisterDeadlineExpiry={() => void registerDeadlineExpiry()}
        />

        <main className="min-w-0 bg-slate-50/50 p-2.5 sm:p-3">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-neutral-200 border-b px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText
                    className="size-4 text-brand-700"
                    aria-hidden="true"
                  />
                  <h3 className="font-bold text-neutral-950 text-sm">
                    Visor documental del hito
                  </h3>
                </div>
                <p className="mt-1 text-neutral-500 text-xs">
                  {selectedItem?.label ?? "Selecciona un hito"}
                </p>
              </div>
              {selectedItem && (
                <span
                  className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${selectedItem.completado ? "border-leve-200 bg-leve-50 text-leve-700" : "border-grave-200 bg-grave-50 text-grave-700"}`}
                >
                  {selectedItem.completado ? "Registrado" : "Pendiente"}
                </span>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!selectedItem && (
                <div className="flex min-h-[28rem] items-center justify-center text-center text-neutral-500 text-sm">
                  Selecciona un hito para consultar o registrar su
                  documentación.
                </div>
              )}

              {selectedItem && isNotification && (
                <section className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
                  <div className="mb-4 border-brand-100 border-b pb-3">
                    <h4 className="font-semibold text-brand-950 text-sm">
                      Notificación de inicio de indagación
                    </h4>
                    <p className="mt-1 text-brand-900/70 text-11px">
                      Complete, revise y genere el documento desde un espacio
                      independiente del checklist.
                    </p>
                  </div>
                  <CausaNotificationPanel causa={causa} compact />
                </section>
              )}

              {selectedItem &&
                !isNotification &&
                (isEditing || !selectedItem.completado) &&
                currentRole !== "docente" && (
                  <RegistrationForm
                    item={selectedItem}
                    mode={selectedItem.completado ? "edit" : "register"}
                    regName={regName}
                    setRegName={setRegName}
                    regFileName={regFileName}
                    regObservations={regObservations}
                    setRegObservations={setRegObservations}
                    regFile={regFile}
                    regText={regText}
                    setRegText={setRegText}
                    regActionDate={regActionDate}
                    setRegActionDate={setRegActionDate}
                    handleFileChange={handleFileChange}
                    onCancel={() => setRegisteringItemId(null)}
                    onSubmit={() =>
                      void handleSaveRegistration(selectedItem.id)
                    }
                    isSaving={isSavingRegistration}
                    errorMessage={registrationError}
                  />
                )}

              {selectedItem &&
                !isNotification &&
                (selectedItem.completado || selectedItem.id === "chk_inv_2") &&
                !isEditing && (
                  <div className="space-y-4">
                    <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-neutral-500">Responsable</p>
                        <p className="mt-1 font-semibold text-neutral-900">
                          {selectedItem.registradoPor || "No informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Fecha</p>
                        <p className="mt-1 font-semibold text-neutral-900">
                          {selectedItem.fechaCompletado || "No informada"}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-neutral-500">Observaciones</p>
                        <p className="mt-1 whitespace-pre-wrap text-neutral-800">
                          {selectedItem.observaciones || "Sin observaciones."}
                        </p>
                      </div>
                    </div>

                    {isLoadingPdf && (
                      <div className="flex min-h-[28rem] items-center justify-center text-neutral-500 text-sm">
                        Cargando documento seguro…
                      </div>
                    )}
                    {!isLoadingPdf && pdfUrl && (
                      <RutaYoloDocumentPreview
                        item={selectedItem}
                        pdfUrl={pdfUrl}
                        expanded={isDocumentExpanded}
                        onToggleExpanded={() =>
                          setIsDocumentExpanded((expanded) => !expanded)
                        }
                      />
                    )}
                    {!isLoadingPdf &&
                      !pdfUrl &&
                      evidenceEntries.length === 0 && (
                        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center">
                          <Upload
                            className="size-7 text-neutral-400"
                            aria-hidden="true"
                          />
                          <p className="mt-2 font-semibold text-neutral-700 text-sm">
                            Este hito no tiene un PDF adjunto.
                          </p>
                          <p className="mt-1 text-neutral-500 text-xs">
                            Puedes editar el hito para adjuntar el documento.
                          </p>
                        </div>
                      )}

                    {evidenceEntries.length > 0 && (
                      <RutaYoloEvidenceThread entries={evidenceEntries} />
                    )}

                    {selectedItem.id === "chk_inv_2" &&
                      currentRole !== "docente" && (
                        <HistoryEntryForm
                          idPrefix="additional-evidence"
                          draftKey={evidenceDraftKey}
                          isSaving={isCreatingManualLog}
                          error={manualLogError}
                          helperText="Agrega otra evidencia sin reemplazar la ya registrada. Cada registro quedará en el historial."
                          onSave={async ({
                            title,
                            description,
                            actionDate,
                            documentText,
                            entryId,
                            documentScope,
                          }) => {
                            return createManualLog({
                              entryId,
                              title,
                              description,
                              type: "Evidencia",
                              participants: "Equipo de Convivencia Escolar",
                              documentFile: additionalEvidenceFile,
                              documentText,
                              documentScope,
                              actionDate,
                            });
                          }}
                          onResetError={resetManualLogError}
                          onClose={() =>
                            setEvidenceSelection((current) =>
                              current?.key === evidenceDraftKey
                                ? null
                                : current,
                            )
                          }
                          additionalFields={(values, updateValues) => (
                            <>
                              <label className="space-y-1.5">
                                <span className="block font-semibold text-neutral-700 text-sm">
                                  Documento de evidencia (opcional)
                                </span>
                                <span className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-white px-3 py-2.5 text-neutral-600 text-sm transition hover:border-brand-300 hover:bg-brand-50/40">
                                  <Upload
                                    className="size-4 text-brand-600"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    {additionalEvidenceFile?.name ||
                                      DOCUMENT_UPLOAD_PLACEHOLDER}
                                  </span>
                                  <input
                                    aria-label="Documento de evidencia adicional"
                                    type="file"
                                    className="sr-only"
                                    accept={DOCUMENT_UPLOAD_ACCEPT}
                                    onChange={(event) => {
                                      const file =
                                        event.target.files?.[0] ?? null;
                                      setEvidenceSelection(
                                        file
                                          ? { key: evidenceDraftKey, file }
                                          : null,
                                      );
                                      resetManualLogError();
                                    }}
                                  />
                                </span>
                              </label>
                              {causa.incidenteId && (
                                <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-brand-200 bg-brand-50/50 p-2.5 text-xs text-brand-950">
                                  <input
                                    aria-label="Compartir evidencia adicional con el incidente grupal"
                                    type="checkbox"
                                    checked={
                                      values.documentScope === "incidente"
                                    }
                                    onChange={(event) =>
                                      updateValues({
                                        documentScope: event.target.checked
                                          ? "incidente"
                                          : "causa",
                                      })
                                    }
                                    className="mt-0.5 h-5 w-5 rounded border-brand-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                                  />
                                  <span>
                                    Compartir esta evidencia con el incidente
                                    grupal.
                                  </span>
                                </label>
                              )}
                            </>
                          )}
                        />
                      )}

                    <div className="flex flex-wrap justify-end gap-2">
                      {selectedItem.documentoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            void openDocument(selectedItem.documentoUrl!)
                          }
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 font-semibold text-neutral-700 text-xs hover:bg-neutral-50"
                        >
                          <Download className="size-3.5" aria-hidden="true" />{" "}
                          Abrir documento
                        </button>
                      )}
                      {currentRole !== "docente" && (
                        <button
                          type="button"
                          onClick={() => handleStartRegister(selectedItem)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 font-semibold text-white text-xs hover:bg-brand-700"
                        >
                          Editar hito
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {selectedItem &&
                !isNotification &&
                !selectedItem.completado &&
                currentRole === "docente" && (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-600 text-sm">
                    El registro de este hito lo realiza el equipo de convivencia
                    o inspectoría.
                  </div>
                )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
