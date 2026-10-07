/** @license SPDX-License-Identifier: Apache-2.0 */

import { useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  Mail,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Button from "@/shared/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/Dialog";
import { maskName } from "@/shared/lib/anotacionesUtils";
import {
  confirmBulkAnnotations,
  previewBulkAnnotations,
  type BulkPreview,
} from "../../shared/api/services/bulkAnnotations.service";

interface Props {
  onClose: () => void;
  onImported: () => void | Promise<void>;
  privacyMode?: boolean;
}

const STEP_LABELS = [
  "Cargar archivo",
  "Revisar coincidencias",
  "Confirmar importación",
];
const pageSize = 8;

export default function BulkAnnotationsImportModal({
  onClose,
  onImported,
  privacyMode = false,
}: Props) {
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof confirmBulkAnnotations>
  > | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pendingLetters =
    preview?.students.filter((student) => student.pending_letter) ?? [];
  const letterCounts = new Map<string, number>();
  for (const student of pendingLetters) {
    const label = student.pending_letter!;
    letterCounts.set(label, (letterCounts.get(label) ?? 0) + 1);
  }
  const blocked =
    !preview ||
    preview.summary.missing_students > 0 ||
    preview.summary.ambiguous_students > 0 ||
    preview.warnings.length > 0;
  const hasChanges = Boolean(
    preview &&
    (preview.summary.annotations_ready > 0 || pendingLetters.length > 0),
  );
  const canConfirm = !blocked && hasChanges && !result && !busy;
  const visibleStudents = (preview?.students ?? []).filter((student) =>
    maskName(student.matched_name ?? student.source_name, privacyMode)
      .toLocaleLowerCase("es-CL")
      .includes(search.toLocaleLowerCase("es-CL")),
  );
  const pageCount = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const pageStudents = visibleStudents.slice(
    page * pageSize,
    (page + 1) * pageSize,
  );

  async function handleFile(nextFile: File | undefined) {
    if (!nextFile || requestPending.current) return;
    setResult(null);
    setRefreshError(false);
    setPreview(null);
    setFile(null);
    setError(null);
    setSearch("");
    setPage(0);
    setStep(1);
    if (
      !/\.pdf$/i.test(nextFile.name) ||
      (nextFile.type && nextFile.type !== "application/pdf")
    ) {
      setError("Selecciona un archivo en formato PDF.");
      return;
    }
    if (nextFile.size === 0 || nextFile.size > 5 * 1024 * 1024) {
      setError("El PDF debe tener contenido y pesar como máximo 5 MB.");
      return;
    }
    requestPending.current = true;
    setBusy(true);
    setFile(nextFile);
    try {
      setPreview(await previewBulkAnnotations(nextFile));
      setStep(2);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible analizar el PDF. Intenta nuevamente.",
      );
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (
      !file ||
      !preview ||
      !canConfirm ||
      step !== 3 ||
      requestPending.current
    )
      return;
    requestPending.current = true;
    setBusy(true);
    setError(null);
    try {
      const imported = await confirmBulkAnnotations(file, preview);
      setResult(imported);
      try {
        await onImported();
      } catch {
        setRefreshError(true);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible confirmar. Revisa el estado de la importación antes de reintentar.",
      );
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    if (event.dataTransfer.files.length !== 1) {
      setError("Selecciona un solo PDF de curso a la vez.");
      return;
    }
    void handleFile(event.dataTransfer.files[0]);
  }

  function closeSafely() {
    if (requestPending.current || busy) return;
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) closeSafely();
      }}
    >
      <DialogContent
        hideClose
        className="max-h-[90vh] max-w-5xl overflow-y-auto p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (requestPending.current) event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Importar fichas PDF</DialogTitle>
        <DialogDescription className="sr-only">
          Actualiza un curso completo desde un PDF, conservando su historial y
          revisando cada coincidencia antes de guardar.
        </DialogDescription>

        <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-neutral-500">
                Anotaciones · Importación masiva
              </p>
              <h2 className="text-lg font-bold text-neutral-800">
                Importar fichas PDF
                {preview ? ` — ${preview.detected_course}` : ""}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={closeSafely}
              disabled={busy}
              className="rounded-xl p-3 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1" aria-label="Progreso de importación">
            {STEP_LABELS.map((label, index) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1"
                aria-current={index + 1 === step ? "step" : undefined}
              >
                <div
                  className={`h-1 w-full rounded-full ${
                    index + 1 <= step || result
                      ? "bg-brand-500"
                      : "bg-neutral-200"
                  }`}
                />
                <span className="text-center text-[10px] font-medium text-neutral-500">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div role="status" aria-live="polite">
            {busy && (
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                {step === 3
                  ? "Guardando anotaciones y cartas. Espera a que termine la importación…"
                  : "Analizando el PDF y comparando con el historial del curso…"}
              </p>
            )}
            {result && (
              <div className="flex items-start gap-3 rounded-xl border border-leve-200 bg-leve-50 p-3 text-sm text-leve-700">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">Importación completada</p>
                  <p className="mt-1">
                    Se agregaron {result.imported} anotaciones en{" "}
                    {result.course} y se crearon {result.pending_cartas} cartas
                    pendientes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-3 text-sm text-gravisima-800"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              {error}
            </div>
          )}
          {refreshError && (
            <p
              role="alert"
              className="rounded-xl border border-grave-200 bg-grave-50 p-3 text-sm text-grave-700"
            >
              Los cambios se guardaron, pero no se pudo refrescar el listado.
              Cierra esta ventana y recarga Anotaciones.
            </p>
          )}

          {step === 1 && (
            <section className="space-y-3">
              <div>
                <h3 className="font-semibold text-neutral-800">
                  Selecciona la ficha del curso
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  El archivo debe contener las fichas personales de convivencia
                  de un solo curso.
                </p>
              </div>
              <div
                role="button"
                tabIndex={0}
                aria-label="Seleccionar ficha PDF del curso"
                aria-disabled={busy}
                onClick={() => {
                  if (!busy) inputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !busy) {
                    event.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging
                    ? "border-brand-500 bg-brand-50"
                    : "border-neutral-300 bg-neutral-50 hover:border-brand-400 hover:bg-brand-50"
                }`}
              >
                <FileUp className="h-8 w-8 text-brand-600" aria-hidden="true" />
                <span className="text-sm font-semibold text-neutral-800">
                  Arrastra tu PDF aquí o selecciona un archivo
                </span>
                <span className="text-xs text-neutral-500">
                  Formato PDF · Máximo 5 MB
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  aria-label="Seleccionar ficha PDF del curso"
                  accept="application/pdf,.pdf"
                  disabled={busy}
                  tabIndex={-1}
                  className="sr-only"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
              {file && (
                <p className="flex items-center gap-2 text-sm text-neutral-700">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {privacyMode ? "PDF seleccionado" : file.name}
                </p>
              )}
              {file && error && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void handleFile(file)}
                >
                  Reintentar análisis
                </Button>
              )}
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
                Nada se guarda hasta que confirmes la importación.
              </p>
            </section>
          )}

          {step > 1 && preview && (
            <section className="space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-800">
                    {privacyMode ? "PDF del curso" : preview.file_name} ·{" "}
                    {preview.detected_course} · {preview.paginas} páginas
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      blocked
                        ? "border-grave-200 bg-grave-50 text-grave-700"
                        : "border-leve-200 bg-leve-50 text-leve-700"
                    }`}
                  >
                    {blocked ? (
                      <AlertTriangle
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {blocked ? "Requiere revisión" : "Coincidencias revisadas"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Summary
                    label="Estudiantes encontrados"
                    value={`${preview.summary.matched_students}/${preview.summary.students_in_file}`}
                  />
                  <Summary
                    label="Anotaciones nuevas"
                    value={`${preview.summary.annotations_ready}`}
                  />
                  <Summary
                    label="Históricas conservadas"
                    value={`${preview.summary.annotations_existing ?? 0}`}
                  />
                  <Summary
                    label="Detectadas en PDF"
                    value={`${preview.summary.annotations_detected}`}
                  />
                  <Summary
                    label="Faltantes / Ambiguos"
                    value={`${preview.summary.missing_students} / ${preview.summary.ambiguous_students}`}
                  />
                  <Summary
                    label="Duplicados descartados"
                    value={`${preview.summary.duplicates_removed}`}
                  />
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  Actualización incremental: se agregan solo las diferencias
                  nuevas y se conservan las anotaciones manuales y los registros
                  de PDFs anteriores.
                </p>
              </div>

              {blocked && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-grave-200 bg-grave-50 p-3 text-sm text-grave-700"
                >
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">
                      La confirmación está bloqueada
                    </p>
                    <p className="mt-1">
                      Revisa estudiantes faltantes o ambiguos y las advertencias
                      del archivo. Corrige el PDF y vuelve a cargarlo.
                    </p>
                    {preview.warnings.length > 0 && (
                      <ul className="mt-2 list-disc pl-5">
                        {preview.warnings.map((warning, index) => (
                          <li key={index}>
                            {privacyMode
                              ? "Hay una ficha que requiere revisión en el archivo."
                              : warning}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {!blocked && !hasChanges && (
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
                  El curso ya está al día con este PDF. No hay nuevas
                  anotaciones ni cartas por crear.
                </p>
              )}

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 bg-white p-3">
                  <div>
                    <h3 className="font-semibold text-neutral-800">
                      {step === 3
                        ? "Cambios que vas a confirmar"
                        : "Coincidencias por estudiante"}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Comparación por nombre normalizado dentro del curso.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-600">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    <input
                      aria-label="Buscar estudiante en la importación"
                      placeholder="Buscar estudiante"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(0);
                      }}
                      className="w-40 bg-transparent text-sm outline-none"
                    />
                  </label>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="sticky top-0 bg-neutral-100 text-neutral-600">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Estudiante
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Coincidencia
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Nuevas
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Conservadas
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Carta resultante
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {pageStudents.map((student, index) => (
                        <tr
                          key={`${student.student_id ?? student.source_name}-${index}`}
                        >
                          <td className="px-3 py-2 font-medium text-neutral-800">
                            {maskName(
                              student.matched_name ?? student.source_name,
                              privacyMode,
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                student.status === "matched"
                                  ? "font-semibold text-leve-700"
                                  : "font-semibold text-grave-700"
                              }
                            >
                              {student.status === "matched"
                                ? "Encontrado"
                                : student.status === "missing"
                                  ? "No encontrado"
                                  : "Ambiguo"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {student.status === "matched"
                              ? student.new_count
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {student.status === "matched"
                              ? student.existing_count
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {student.status !== "matched"
                              ? "Por resolver"
                              : student.pending_letter
                                ? `${student.pending_letter} · Quedará pendiente`
                                : student.current_letter
                                  ? `${student.current_letter} · Conserva su estado`
                                  : "Sin cambio de etapa"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pageStudents.length === 0 && (
                    <p className="bg-white p-6 text-center text-sm text-neutral-500">
                      No hay estudiantes que coincidan con la búsqueda.
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-white p-3 text-xs text-neutral-500">
                  <span>
                    {visibleStudents.length
                      ? `${page * pageSize + 1}–${Math.min(
                          (page + 1) * pageSize,
                          visibleStudents.length,
                        )} de ${visibleStudents.length}`
                      : "0 estudiantes"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="Página anterior"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span>
                      Página {page + 1} de {pageCount}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label="Página siguiente"
                      disabled={page + 1 >= pageCount}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-grave-200 bg-grave-50 p-3 text-sm text-grave-700">
                  <p className="flex items-center gap-2 font-semibold">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {result
                      ? `${result.pending_cartas} cartas pendientes creadas`
                      : `${pendingLetters.length} cartas quedarían pendientes`}
                  </p>
                  {!result && letterCounts.size > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {Array.from(letterCounts, ([label, count]) => (
                        <li
                          key={label}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>{label}</span>
                          <strong>{count}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs">
                    Una carta nueva o un cambio de etapa queda pendiente. Si la
                    carta se mantiene, conserva su estado.
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
                  <p className="flex items-center gap-2 font-semibold text-neutral-800">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Trazabilidad del archivo
                  </p>
                  <p className="mt-2 text-xs">
                    {preview.summary.duplicates_removed} duplicados internos
                    descartados. La confirmación vuelve a comprobar el archivo y
                    deja registro de la operación.
                  </p>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-brand-700">
                      Ver huella SHA-256
                    </summary>
                    <code className="mt-1 block break-all text-neutral-500">
                      {preview.file_hash}
                    </code>
                  </details>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-neutral-100 p-4">
          <div>
            {!result && step > 1 && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setStep(step - 1);
                  setError(null);
                }}
                className="rounded-xl px-4 py-2 font-medium"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {step === 2 ? "Cambiar archivo" : "Volver a revisar"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {result ? (
              <Button
                variant="custom"
                onClick={onClose}
                className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Volver a Anotaciones
              </Button>
            ) : step === 1 ? (
              <span className="text-xs text-neutral-500">
                Carga y análisis sin guardar cambios
              </span>
            ) : step === 2 ? (
              <Button
                variant="custom"
                disabled={!canConfirm}
                onClick={() => setStep(3)}
                className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
              >
                Revisar confirmación
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                variant="custom"
                disabled={!canConfirm}
                isLoading={busy}
                onClick={() => void handleConfirm()}
                className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Confirmar importación masiva
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-neutral-900">{value}</p>
    </div>
  );
}
