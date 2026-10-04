/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Upload,
} from "lucide-react";
import type {
  Causa,
  ChecklistItem,
  FaseProcedimental,
} from "../../shared/lib/types";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import {
  getCausaDeadline,
  getCausaDeadlineStages,
} from "../causas/causaPresentation";
import { getApplicableChecklistItems } from "../../shared/lib/domain/investigationChecklist";
import { getPhaseTone } from "../../shared/lib/domain/phaseTones";
import CausaNotificationPanel from "../causas/notificacionDocgen/CausaNotificationPanel";
import RegistrationForm from "./RegistrationForm";
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

function formatDeadlineDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getItemDeadline(item: ChecklistItem, causa: Causa) {
  if (item.fechaLimite) return formatDeadlineDate(item.fechaLimite);
  if (item.id === "chk_rec_3") return formatDeadlineDate(causa.fechaLimite24h);

  const investigationDeadline = getCausaDeadline(causa).deadlineDate;
  const stages = getCausaDeadlineStages(causa);
  if (item.id.startsWith("chk_inv_")) {
    return formatDeadlineDate(investigationDeadline);
  }
  if (item.id.startsWith("chk_res_")) {
    return formatDeadlineDate(stages.informeConcluyente?.deadlineDate);
  }
  return null;
}

export default function RutaYoloView({
  causa,
  currentFase,
  selectedPhase,
  onSelectPhase,
}: RutaYoloViewProps) {
  const summary = getCausaOperationalSummary(causa);
  const activePhase = selectedPhase ?? (currentFase as FaseProcedimental);
  const activeTone = getPhaseTone(activePhase);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<FaseProcedimental | null>(
    null,
  );
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isDocumentExpanded, setIsDocumentExpanded] = useState(false);
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
      <div className="flex flex-wrap items-center gap-3 border border-neutral-200 bg-white px-3 py-2 text-[10px] shadow-sm">
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
      <div className="grid min-h-0 grid-cols-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-neutral-200 border-b bg-neutral-50/50 lg:border-r lg:border-b-0">
          <div className="border-neutral-200 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-neutral-950 text-sm uppercase tracking-wider">
                  Índice foliado · Etapa {activePhaseIndex + 1}
                </p>
                <p className="mt-1 text-neutral-600 text-[11px]">
                  Actuaciones de la fase actual
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 font-semibold text-10px ${activeTone.softBg} ${activeTone.softText}`}
              >
                {phaseItems.length} hitos
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              {summary.phaseProgress.map((phase) => {
                const phaseName = phase.phase as FaseProcedimental;
                const items = getApplicableChecklistItems(causa, phaseName);
                const tone = getPhaseTone(phaseName);
                const isExpanded = phaseName === expandedPhase;
                const isCurrent = phaseName === summary.currentPhase;

                return (
                  <section
                    key={phase.phase}
                    className={`overflow-hidden rounded-xl border bg-white ${tone.frame}`}
                  >
                    <button
                      type="button"
                      onClick={() => selectPhase(phaseName)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-neutral-50"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} hitos de ${phase.phase}`}
                    >
                      <span
                        className={`font-semibold text-xs ${isExpanded ? tone.strongText : "text-neutral-700"}`}
                      >
                        {phase.phase}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold text-10px ${isCurrent ? `${tone.softBg} ${tone.softText}` : "bg-neutral-100 text-neutral-600"}`}
                      >
                        {phase.completed}/{phase.total}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 border-neutral-100 border-t bg-neutral-50/40 p-2">
                        {items.map((item) => {
                          const isSelected = item.id === selectedItemId;
                          const deadline = getItemDeadline(item, causa);
                          return (
                            <div key={item.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedItemId(item.id)}
                                className={`w-full rounded-lg border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isSelected ? "border-emerald-500 bg-emerald-50/60 shadow-sm" : "border-neutral-200 bg-white hover:border-brand-300"}`}
                                aria-pressed={isSelected}
                                aria-label={`${item.label}: ${item.completado ? "registrado" : "pendiente"}`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <span
                                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${item.completado ? "border-leve-600 bg-leve-600 text-white" : "border-neutral-300 bg-white text-transparent"}`}
                                  >
                                    <Check
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block font-semibold text-neutral-900 text-[11px] leading-snug">
                                      {item.label}
                                    </span>
                                    <span className="mt-1 block text-neutral-500 text-[10px] leading-snug">
                                      {item.descripcion}
                                    </span>
                                    <span className="mt-1 flex flex-wrap gap-1 text-[9px] leading-snug">
                                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
                                        {item.requeridoPor}
                                      </span>
                                      {deadline && (
                                        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">
                                          Plazo · {deadline}
                                        </span>
                                      )}
                                      <span
                                        className={`rounded px-1.5 py-0.5 ${item.completado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                                      >
                                        {item.completado
                                          ? `Folio · ${item.fechaCompletado || "registrado"}`
                                          : deadline
                                            ? "Pendiente"
                                            : "Sin fecha registrada"}
                                      </span>
                                    </span>
                                    {item.completado && (
                                      <span className="mt-1 block text-[9px] text-neutral-500">
                                        Por:{" "}
                                        {item.registradoPor ||
                                          "Equipo de Convivencia Escolar"}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </button>
                              {item.id === "chk_imp_2" &&
                                currentRole !== "docente" && (
                                  <div className="mt-1 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 px-2 py-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void registerDeadlineExpiry()
                                      }
                                      disabled={
                                        deadlineExpiryRegistered ||
                                        isCreatingManualLog
                                      }
                                      className="w-full text-left text-[10px] font-semibold text-brand-700 disabled:cursor-not-allowed disabled:text-emerald-700"
                                    >
                                      {deadlineExpiryRegistered
                                        ? "✓ Plazo vencido registrado en historial"
                                        : isCreatingManualLog
                                          ? "Registrando…"
                                          : "Registrar plazo vencido sin reconsideración o apelación"}
                                    </button>
                                    {manualLogError && (
                                      <p
                                        role="alert"
                                        className="mt-1 text-[10px] text-red-700"
                                      >
                                        {manualLogError}
                                      </p>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-slate-50/50 p-2.5 sm:p-3">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
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
                selectedItem.completado &&
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
                      <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100">
                        <div className="flex items-center justify-between gap-2 border-neutral-200 border-b bg-white px-3 py-2">
                          <span className="text-neutral-500 text-xs">
                            Vista previa segura del documento
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setIsDocumentExpanded((expanded) => !expanded)
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 font-semibold text-neutral-700 text-xs hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            aria-label={
                              isDocumentExpanded
                                ? "Reducir visor documental"
                                : "Ampliar visor documental"
                            }
                          >
                            {isDocumentExpanded ? (
                              <Minimize2
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <Maximize2
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {isDocumentExpanded ? "Reducir" : "Ampliar"}
                          </button>
                        </div>
                        <iframe
                          title={`Documento PDF de ${selectedItem.label}`}
                          src={pdfUrl}
                          className={`${isDocumentExpanded ? "h-[min(78vh,860px)]" : "h-[min(52vh,600px)]"} w-full`}
                        />
                      </div>
                    )}
                    {!isLoadingPdf && !pdfUrl && (
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
