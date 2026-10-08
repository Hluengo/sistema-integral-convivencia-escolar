/** @license SPDX-License-Identifier: Apache-2.0 */

import { Fragment, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  Info,
  LockKeyhole,
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
import { formatAnnotationDisplayText } from "./AnotacionesStudentDetailModal/annotationDisplay";

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
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
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
  const displayName = (name: string | null) =>
    maskName(name ?? "Sin nombre", privacyMode);
  const visibleStudents = (preview?.students ?? []).filter((student) =>
    displayName(student.matched_name ?? student.source_name)
      .toLocaleLowerCase("es-CL")
      .includes(search.toLocaleLowerCase("es-CL")),
  );
  const pageCount = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const pageStudents = visibleStudents.slice(
    page * pageSize,
    (page + 1) * pageSize,
  );
  const newAnnotationsOf = (studentId: string | null) =>
    (preview?.annotations ?? []).filter(
      (annotation) => annotation.student_id === studentId,
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
    setExpandedStudent(null);
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
        className="flex max-h-[92vh] w-[min(96vw,72rem)] max-w-none flex-col overflow-hidden p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (requestPending.current) event.preventDefault();
        }}
        aria-label="Importar fichas PDF"
      >
        <DialogTitle className="sr-only">Importar fichas PDF</DialogTitle>
        <DialogDescription className="sr-only">
          Actualiza un curso completo desde un PDF, conservando su historial y
          revisando cada coincidencia antes de guardar.
        </DialogDescription>

        <header className="border-b border-neutral-200 bg-white px-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500">
                Anotaciones <span className="mx-1 text-neutral-400">·</span>{" "}
                Importación masiva
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                Importar fichas PDF{" "}
                {preview && (
                  <>
                    <span className="font-normal text-neutral-400">—</span>{" "}
                    {preview.detected_course}
                  </>
                )}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Cerrar importación"
              onClick={closeSafely}
              disabled={busy}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Progreso de importación" className="mt-6">
            <ol className="grid grid-cols-3 gap-3">
              {STEP_LABELS.map((label, index) => {
                const done = index + 1 < step || result !== null;
                const active = index + 1 === step && !result;
                return (
                  <li
                    key={label}
                    aria-current={active ? "step" : undefined}
                    className={`flex flex-col border-b-[3.5px] pb-3 transition-all ${
                      done || active ? "border-brand-600" : "border-neutral-200"
                    }`}
                  >
                    <span
                      className={`text-center text-xs ${
                        active
                          ? "font-bold text-brand-700"
                          : done
                            ? "font-semibold text-neutral-600"
                            : "font-medium text-neutral-400"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-[#F8FAFC] px-6 py-6">
          <div role="status" aria-live="polite">
            {busy && (
              <p className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
                {step === 3
                  ? "Guardando anotaciones y cartas. Espera a que termine la importación…"
                  : "Analizando el PDF y comparando con el historial del curso…"}
              </p>
            )}
            {result && (
              <div className="flex items-start gap-3 rounded-xl border border-leve-200 bg-leve-50 p-4 text-sm text-leve-700">
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
              className="flex items-start gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 text-sm text-gravisima-800"
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
            <section className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="font-bold text-neutral-900">
                Selecciona la ficha del curso
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                El archivo debe contener las fichas personales de convivencia de
                un solo curso.
              </p>
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
                className={`mt-5 flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging
                    ? "border-brand-500 bg-brand-50"
                    : "border-neutral-300 bg-neutral-50 hover:border-brand-400 hover:bg-brand-50/40"
                }`}
              >
                <FileUp
                  className="h-8 w-8 text-neutral-700"
                  aria-hidden="true"
                />
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
                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {privacyMode ? "PDF seleccionado" : file.name}
                </p>
              )}
              {file && error && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void handleFile(file)}
                  className="mt-3"
                >
                  Reintentar análisis
                </Button>
              )}
              <p className="mt-5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
                Nada se guarda hasta que confirmes la importación.
              </p>
            </section>
          )}

          {step > 1 && preview && (
            <>
              <section
                aria-label="Resumen del archivo"
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-neutral-50/60 px-6 py-3.5">
                  <p className="text-sm font-semibold text-neutral-900">
                    {privacyMode ? "PDF del curso" : preview.file_name}
                    <span className="font-normal text-neutral-300"> · </span>
                    <span className="font-medium text-neutral-700">
                      {preview.detected_course}
                    </span>
                    <span className="font-normal text-neutral-300"> · </span>
                    <span className="font-normal text-neutral-500">
                      {preview.paginas} páginas
                    </span>
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
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
                <div className="grid grid-cols-2 divide-neutral-100 bg-white sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
                  <Kpi
                    label="Estudiantes encontrados"
                    value={`${preview.summary.matched_students}/${preview.summary.students_in_file}`}
                  />
                  <Kpi
                    label="Anotaciones nuevas"
                    value={`${preview.summary.annotations_ready}`}
                  />
                  <Kpi
                    label="Históricas conservadas"
                    value={`${preview.summary.annotations_existing ?? 0}`}
                  />
                  <Kpi
                    label="Detectadas en PDF"
                    value={`${preview.summary.annotations_detected}`}
                  />
                  <Kpi
                    label="Faltantes / ambiguos"
                    value={`${preview.summary.missing_students} / ${preview.summary.ambiguous_students}`}
                  />
                  <Kpi
                    label="Duplicados descartados"
                    value={`${preview.summary.duplicates_removed}`}
                  />
                </div>
                <p className="flex items-center gap-1.5 border-t border-neutral-100 bg-neutral-50/40 px-6 py-2.5 text-xs text-neutral-500">
                  <Info
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  Actualización incremental: se agregan solo las diferencias
                  nuevas y se conservan las anotaciones manuales y los registros
                  de PDFs anteriores.
                </p>
              </section>

              {blocked && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-grave-200 bg-grave-50 p-4 text-sm text-grave-700"
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
                <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                  El curso ya está al día con este PDF. No hay nuevas
                  anotaciones ni cartas por crear.
                </p>
              )}

              <section
                aria-label="Coincidencias por estudiante"
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-neutral-200 p-6 pb-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900">
                      {step === 3
                        ? "Cambios que vas a confirmar"
                        : "Coincidencias por estudiante"}
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Comparación por nombre normalizado dentro del curso.
                    </p>
                  </div>
                  <label className="relative w-full md:w-80">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                      aria-hidden="true"
                    />
                    <input
                      aria-label="Buscar estudiante en la importación"
                      placeholder="Buscar estudiante"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(0);
                      }}
                      className="w-full rounded-xl border border-neutral-300 bg-white py-2 pr-4 pl-9 text-sm placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </label>
                </div>
                <div
                  className="overflow-x-auto"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabla de coincidencias desplazable"
                >
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Anotaciones nuevas, registros conservados y carta
                      resultante por estudiante
                    </caption>
                    <thead className="border-b border-neutral-200 bg-neutral-50/90 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Estudiante
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Coincidencia
                        </th>
                        <th scope="col" className="px-6 py-3 text-center">
                          Nuevas
                        </th>
                        <th scope="col" className="px-6 py-3 text-center">
                          Conservadas
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Carta resultante
                        </th>
                        <th scope="col" className="px-6 py-3 text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      {pageStudents.map((student, index) => {
                        const key = `${student.student_id ?? student.source_name}-${index}`;
                        const expanded = expandedStudent === key;
                        const news = newAnnotationsOf(student.student_id);
                        return (
                          <Fragment key={key}>
                            <tr className="transition-colors hover:bg-neutral-50/70">
                              <th
                                scope="row"
                                className="px-6 py-3.5 font-semibold tracking-tight text-neutral-900"
                              >
                                {displayName(
                                  student.matched_name ?? student.source_name,
                                )}
                              </th>
                              <td className="px-6 py-3.5">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                    student.status === "matched"
                                      ? "border-leve-200/60 bg-leve-50 text-leve-700"
                                      : "border-grave-200 bg-grave-50 text-grave-700"
                                  }`}
                                >
                                  {student.status === "matched"
                                    ? "Encontrado"
                                    : student.status === "missing"
                                      ? "No encontrado"
                                      : "Ambiguo"}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-center font-medium text-neutral-800">
                                {student.status === "matched"
                                  ? student.new_count
                                  : "—"}
                              </td>
                              <td className="px-6 py-3.5 text-center text-neutral-500">
                                {student.status === "matched"
                                  ? student.existing_count
                                  : "—"}
                              </td>
                              <td className="px-6 py-3.5 text-xs text-neutral-600">
                                {student.status !== "matched" ? (
                                  "Por resolver"
                                ) : student.pending_letter ? (
                                  <>
                                    <span className="font-medium text-neutral-800">
                                      {student.pending_letter}
                                    </span>{" "}
                                    <span className="text-neutral-400">·</span>{" "}
                                    <span className="font-medium text-grave-700">
                                      {result
                                        ? "Pendiente"
                                        : "Quedará pendiente"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium text-neutral-800">
                                      {student.current_letter ?? "Sin carta"}
                                    </span>{" "}
                                    <span className="text-neutral-400">·</span>{" "}
                                    <span className="font-normal text-neutral-500">
                                      {student.current_letter
                                        ? "Conserva su estado"
                                        : "Sin cambio de etapa"}
                                    </span>
                                  </>
                                )}
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                {student.status === "matched" &&
                                student.new_count > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedStudent(expanded ? null : key)
                                    }
                                    aria-expanded={expanded}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-brand-700"
                                  >
                                    Ver detalle
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                                      aria-hidden="true"
                                    />
                                  </button>
                                ) : (
                                  <span className="text-xs text-neutral-300">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                            {expanded && (
                              <tr
                                className="bg-neutral-50/60"
                                aria-label={`Detalle de anotaciones nuevas de ${displayName(student.matched_name ?? student.source_name)}`}
                              >
                                <td colSpan={6} className="px-6 py-4">
                                  <p className="mb-2 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                                    Anotaciones nuevas de{" "}
                                    {displayName(
                                      student.matched_name ??
                                        student.source_name,
                                    )}
                                  </p>
                                  <ul className="space-y-2">
                                    {news.map((annotation, position) => (
                                      <li
                                        key={`${annotation.fecha_iso}-${position}`}
                                        className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-neutral-700"
                                      >
                                        <span className="font-semibold text-neutral-500">
                                          {annotation.fecha_iso} ·{" "}
                                          {annotation.tipo} ·{" "}
                                          {annotation.categoria}
                                          {annotation.profesor
                                            ? ` · ${privacyMode ? "Docente" : annotation.profesor}`
                                            : ""}
                                        </span>
                                        <span className="mt-1 block text-sm text-neutral-800">
                                          {formatAnnotationDisplayText(
                                            `[${annotation.categoria}] ${annotation.texto}`,
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {pageStudents.length === 0 && (
                    <p className="bg-white p-8 text-center text-sm text-neutral-500">
                      No hay estudiantes que coincidan con la búsqueda.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 bg-white px-6 py-4 text-xs text-neutral-500">
                  <span>
                    Mostrando{" "}
                    <span className="font-semibold text-neutral-700">
                      {visibleStudents.length
                        ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, visibleStudents.length)}`
                        : "0"}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold text-neutral-700">
                      {visibleStudents.length}
                    </span>{" "}
                    estudiantes
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
                    <span className="font-medium text-neutral-700">
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
              </section>

              <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
                <section
                  aria-label="Cartas pendientes"
                  className="flex flex-col justify-between rounded-2xl border border-grave-200/90 bg-grave-50/50 p-6 text-neutral-800 shadow-sm"
                >
                  <div className="space-y-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-grave-900">
                      <Mail
                        className="h-5 w-5 shrink-0 text-grave-600"
                        aria-hidden="true"
                      />
                      {result
                        ? `${result.pending_cartas} cartas pendientes creadas`
                        : `${pendingLetters.length} cartas quedarían pendientes`}
                    </p>
                    {!result && letterCounts.size > 0 && (
                      <ul className="space-y-2 pl-7 text-xs font-medium text-grave-950/80">
                        {Array.from(letterCounts, ([label, count]) => (
                          <li
                            key={label}
                            className="flex items-center justify-between"
                          >
                            <span>{label}</span>
                            <strong className="rounded bg-grave-100/70 px-2 py-0.5 text-[11px] font-bold text-grave-900">
                              {count}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="mt-4 border-t border-grave-200/60 pt-3 text-[11px] leading-relaxed text-grave-800/90">
                    Una carta nueva o un cambio de etapa queda pendiente. Si la
                    carta se mantiene, conserva su estado.
                  </p>
                </section>
                <section
                  aria-label="Trazabilidad del archivo"
                  className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <div className="space-y-3.5">
                    <p className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                      <ShieldCheck
                        className="h-5 w-5 shrink-0 text-brand-700"
                        aria-hidden="true"
                      />
                      Trazabilidad del archivo
                    </p>
                    <p className="text-xs leading-relaxed text-neutral-600">
                      {preview.summary.duplicates_removed} duplicados internos
                      descartados. La confirmación vuelve a comprobar el archivo
                      y deja registro de la operación auditada.
                    </p>
                  </div>
                  <details className="pt-4 text-xs">
                    <summary className="cursor-pointer font-semibold text-brand-700 hover:text-brand-800">
                      Ver huella SHA-256
                    </summary>
                    <code className="mt-2 block text-neutral-500 break-all">
                      {preview.file_hash}
                    </code>
                  </details>
                </section>
              </div>
            </>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 mt-auto border-t border-neutral-200 bg-white py-4 shadow-lg">
          <div className="mx-auto flex max-w-none items-center justify-between px-6">
            <div>
              {step === 1 ? (
                <Button variant="secondary" onClick={onClose} disabled={busy}>
                  Cancelar
                </Button>
              ) : (
                !result && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setStep(step - 1);
                      setError(null);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {step === 2 ? "Cambiar archivo" : "Volver a revisar"}
                  </Button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              {result ? (
                <Button
                  variant="custom"
                  onClick={onClose}
                  className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-brand-700"
                >
                  Volver a Anotaciones
                </Button>
              ) : step === 1 ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Carga y análisis sin guardar cambios
                </span>
              ) : step === 2 ? (
                <Button
                  variant="custom"
                  disabled={!canConfirm}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-brand-700 disabled:opacity-40"
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
                  className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Confirmar importación masiva
                </Button>
              )}
            </div>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 px-5 transition-colors hover:bg-neutral-50/50">
      <p className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl">
        {value}
      </p>
    </div>
  );
}
