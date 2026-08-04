/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { memo, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileCheck2,
  GraduationCap,
  Pencil,
  Search,
} from 'lucide-react';
import { maskName, getSemaphoricStyle } from '../../shared/lib/anotacionesUtils';
import type { DisciplinaryStatus } from '../../shared/lib/types';
import {
  ANNOTATION_EXPORT_OPTIONS,
  downloadAnnotationsExcel,
  getStudentsForAnnotationExport,
  type AnnotationExportScope,
  type AnnotationExportStudent,
} from './annotationsExcelExport';
import {
  getEffectiveDisciplinaryStage,
  type LetterType,
} from '../../shared/lib/domain/disciplinaryStage';
import {
  matchesAnnotationFilter,
  matchesCartaStatusFilter,
  matchesCourseFilter,
  WITHOUT_COURSE_FILTER,
} from './annotationStudentFilters';
import { formatChileDate } from '../../shared/lib/dateTime';

/** @license SPDX-License-Identifier: Apache-2.0 */

interface StudentRowData extends AnnotationExportStudent {
  course_id: string;
  teacher_id: string;
  status: string;
  disciplinary_status: DisciplinaryStatus;
  ai_analysis?: { negativas: number; positivas: number; informativas: number };
}

const DISC_STATUS: Record<string, { text: string; bg: string }> = {
  Verde: { text: 'Sin medida activa', bg: 'bg-leve-100 text-leve-700' },
  Amarillo: { text: 'Amonestación Escrita', bg: 'bg-grave-100 text-grave-700' },
  Naranja: { text: 'Carta de Compromiso Conductual', bg: 'bg-muygrave-100 text-muygrave-700' },
  Rojo: { text: 'Derivación a Convivencia Escolar', bg: 'bg-gravisima-100 text-gravisima-700' },
};

const CARD_STATUS_BADGE: Record<string, { bg: string; textClass: string }> = {
  Vigente: { bg: 'bg-leve-100', textClass: 'text-leve-700' },
  Archivada: { bg: 'bg-leve-100', textClass: 'text-leve-800' },
  Procesada: { bg: 'bg-blue-100', textClass: 'text-blue-800' },
  Pendiente: { bg: 'bg-grave-100', textClass: 'text-grave-700' },
  Cumplida: { bg: 'bg-blue-100', textClass: 'text-blue-800' },
  Incumplida: { bg: 'bg-gravisima-100', textClass: 'text-gravisima-700' },
  Anulada: { bg: 'bg-neutral-100', textClass: 'text-neutral-500' },
};

const getDisciplinaryStatusLabel = (
  count: number,
  effectiveLetterType?: LetterType | null,
): { text: string; bg: string } => {
  const stage = getEffectiveDisciplinaryStage(count, effectiveLetterType);
  if (stage.key === 'amonestacion') return DISC_STATUS.Amarillo;
  if (stage.key === 'compromiso_conductual') return DISC_STATUS.Naranja;
  if (stage.key === 'derivacion') return DISC_STATUS.Rojo;
  return DISC_STATUS.Verde;
};

interface AnotacionesStudentTableProps {
  students: StudentRowData[];
  privacyMode: boolean;
  onSelectStudent: (student: StudentRowData) => void;
  onEditAnnotations: (student: StudentRowData) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  cartaStatuses?: Record<string, string[]>;
}

const FILTER_TABS = [
  { key: 'con_registro', label: 'Con Registro' },
  { key: 'sin_carta', label: 'Sin Carta' },
  { key: 'amonestacion', label: 'Amonestación' },
  { key: 'compromiso', label: 'Compromiso' },
  { key: 'derivacion', label: 'Derivación' },
];

function getEffectiveNegCount(s: { annotations_count: number }): number {
  return Number(s.annotations_count) || 0;
}

function filterStudents(
  students: AnotacionesStudentTableProps['students'],
  activeFilter: string,
  searchQuery: string,
  selectedCourseId: string,
  selectedCartaStatus: string,
  cartaStatuses: Record<string, string[]>,
) {
  let filtered = students;

  filtered = filtered.filter((student) => matchesAnnotationFilter(student, activeFilter));
  filtered = filtered.filter((student) => matchesCourseFilter(student, selectedCourseId));
  filtered = filtered.filter((student) =>
    matchesCartaStatusFilter({ cartaStatuses: cartaStatuses[student.id] }, selectedCartaStatus),
  );

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.rut?.toLowerCase().includes(q) ||
        s.course_name?.toLowerCase().includes(q),
    );
  }

  return filtered;
}

export default memo(function AnotacionesStudentTable({
  students,
  privacyMode,
  onSelectStudent,
  onEditAnnotations,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  isLoading,
  cartaStatuses = {},
}: AnotacionesStudentTableProps) {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCartaStatus, setSelectedCartaStatus] = useState('');
  const courseOptions = useMemo(() => {
    const courses = new Map<string, string>();
    for (const student of students) {
      const value = student.course_id || WITHOUT_COURSE_FILTER;
      const label = student.course_name?.trim() || 'Sin curso asignado';
      if (!courses.has(value)) courses.set(value, label);
    }
    return [...courses.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, 'es-CL', {
          numeric: true,
          sensitivity: 'base',
        }),
      );
  }, [students]);
  const filteredStudents = filterStudents(
    students,
    activeFilter,
    searchQuery,
    selectedCourseId,
    selectedCartaStatus,
    cartaStatuses,
  );
  const exportMenuRef = useRef<HTMLDetailsElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (scope: AnnotationExportScope) => {
    const selectedStudents = getStudentsForAnnotationExport(students, filteredStudents, scope);
    if (selectedStudents.length === 0) {
      setExportError('No hay estudiantes para exportar con ese criterio.');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      await downloadAnnotationsExcel({
        students: selectedStudents,
        cartaStatuses,
        privacyMode,
        scope,
      });
      exportMenuRef.current?.removeAttribute('open');
    } catch (error: unknown) {
      console.error('Error exportando anotaciones a Excel:', error);
      setExportError('No se pudo generar el archivo Excel. Inténtalo nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            id="search-student"
            placeholder="Buscar estudiante, RUT o curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar estudiante"
            className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-4 pl-10 font-medium text-neutral-800 text-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="relative sm:w-56">
          <GraduationCap
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <select
            id="annotation-course-filter"
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            aria-label="Filtrar estudiantes por curso"
            className="w-full appearance-none rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-9 pl-10 font-medium text-neutral-800 text-sm transition-colors hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Todos los cursos</option>
            {courseOptions.map((course) => (
              <option key={course.value} value={course.value}>
                {course.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
        </div>
        <div className="relative sm:w-44">
          <FileCheck2
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <select
            id="annotation-carta-status-filter"
            value={selectedCartaStatus}
            onChange={(event) => setSelectedCartaStatus(event.target.value)}
            aria-label="Filtrar estudiantes por estado de carta"
            className="w-full appearance-none rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-9 pl-10 font-medium text-neutral-800 text-sm transition-colors hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Todos los estados</option>
            <option value="Procesada">Procesada</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Archivada">Archivada</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
        </div>
        <details ref={exportMenuRef} className="group relative shrink-0">
          <summary className="inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-leve-200 bg-leve-50 px-4 py-2 font-semibold text-leve-700 text-sm transition-colors hover:bg-leve-100 focus:outline-none focus:ring-2 focus:ring-leve-500/30 sm:w-auto">
            <Download className="size-4" aria-hidden="true" />
            {isExporting ? 'Generando Excel…' : 'Exportar Excel'}
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
            {ANNOTATION_EXPORT_OPTIONS.map((option) => {
              const count = getStudentsForAnnotationExport(
                students,
                filteredStudents,
                option.scope,
              ).length;
              return (
                <button
                  key={option.scope}
                  type="button"
                  onClick={() => void handleExport(option.scope)}
                  disabled={isExporting || count === 0}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-neutral-700 text-sm transition-colors hover:bg-leve-50 hover:text-leve-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="size-4 shrink-0" aria-hidden="true" />
                    {option.label}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-500 text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </details>
      </div>

      {exportError && (
        <p className="text-gravisima-600 text-sm" role="alert">
          {exportError}
        </p>
      )}

      {/* Filter Tabs */}
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 font-semibold text-sm transition-colors duration-150 ${
              activeFilter === tab.key
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-neutral-200/60 bg-neutral-50">
              <tr aria-label="Estado de carga de estudiantes">
                <th className="px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Estudiante
                </th>

                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider md:table-cell">
                  Curso
                </th>

                <th className="px-4 py-3 text-center font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Positivas
                </th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Negativas
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider lg:table-cell">
                  Último Registro
                </th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Estado
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider md:table-cell">
                  Estado de cartas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr aria-label="Estado de carga de estudiantes">
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
                        aria-hidden="true"
                      />
                      Cargando estudiantes...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr aria-label="Estado de carga de estudiantes">
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500 text-sm">
                    No se encontraron estudiantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const effectiveNeg = getEffectiveNegCount(student);
                  const effectiveStage = getEffectiveDisciplinaryStage(
                    effectiveNeg,
                    student.effective_letter_type,
                  );
                  const style = getSemaphoricStyle(effectiveStage.min);
                  const status = getDisciplinaryStatusLabel(
                    effectiveNeg,
                    student.effective_letter_type,
                  );
                  const negativeCount = student.annotations_count || 0;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => onSelectStudent(student)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectStudent(student);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalle de ${maskName(student.full_name, privacyMode)}`}
                      className={`cursor-pointer transition-colors ${style.rowBg}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{maskName(student.full_name, privacyMode)}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditAnnotations(student);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            aria-label={`Editar anotaciones de ${maskName(student.full_name, privacyMode)}`}
                            title="Editar anotaciones"
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm md:table-cell">
                        {student.course_name || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-neutral-600 text-sm">
                        <span className="inline-flex items-center justify-center rounded-full bg-leve-50 px-2.5 py-0.5 font-semibold text-leve-700 text-xs">
                          {Number(student.positive_annotations_count) || 0}
                        </span>
                        {student.ai_analysis && student.ai_analysis.positivas > 0 && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 font-semibold text-[10px] text-indigo-500">
                            +{student.ai_analysis.positivas}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-neutral-600 text-sm">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold text-xs ${style.badge}`}
                        >
                          {effectiveNeg}
                        </span>
                        {student.ai_analysis && student.ai_analysis.negativas > negativeCount && (
                          <span
                            className="ml-1 inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 font-semibold text-[10px] text-indigo-600"
                            title={`${negativeCount} registradas + ${student.ai_analysis.negativas} IA`}
                          >
                            IA
                          </span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm lg:table-cell">
                        {formatChileDate(student.last_annotation_date)}
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-sm"
                        aria-label={`Estado disciplinario: ${status.text}`}
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium text-xs ${status.bg}`}
                        >
                          <span
                            className={`inline-block size-2 rounded-full ${style.dot}`}
                            aria-hidden="true"
                          />
                          <span className="hidden md:inline">{status.text}</span>
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell">
                        {(() => {
                          const statuses = cartaStatuses[student.id];
                          if (!statuses || statuses.length === 0) {
                            return <span className="text-neutral-400">—</span>;
                          }
                          const sorted = [...statuses].sort((a, b) => {
                            if (a === 'Pendiente') return -1;
                            if (b === 'Pendiente') return 1;
                            if (a === 'Procesada' && b === 'Archivada') return -1;
                            if (a === 'Archivada' && b === 'Procesada') return 1;
                            return 0;
                          });
                          return (
                            <div className="flex flex-wrap gap-1">
                              {sorted.map((s) => {
                                const badge = CARD_STATUS_BADGE[s];
                                if (!badge) return null;
                                return (
                                  <span
                                    key={s}
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] ${badge.bg} ${badge.textClass}`}
                                  >
                                    {s}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: Pagination info and color legend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-neutral-500 text-sm">
          Mostrando <span className="font-medium text-neutral-700">{filteredStudents.length}</span>{' '}
          de <span className="font-medium text-neutral-700">{students.length}</span> estudiantes
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-neutral-500 text-xs">Leyenda:</span>
          <span className="inline-flex items-center gap-1 text-neutral-600 text-xs">
            <span className="inline-block size-2.5 rounded-full bg-grave-500" />
            Amonestación (5–9)
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-600 text-xs">
            <span className="inline-block size-2.5 rounded-full bg-muygrave-500" />
            Compromiso (10–14)
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-600 text-xs">
            <span className="inline-block size-2.5 rounded-full bg-gravisima-500" />
            Derivación (15+)
          </span>
        </div>
      </div>
    </div>
  );
});
