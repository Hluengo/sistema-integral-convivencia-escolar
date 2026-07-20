/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { Search } from 'lucide-react';
import { maskName, maskRut, getSemaphoricStyle, TEACHERS_BY_COURSE } from '../../lib/anotacionesUtils';
import type { DisciplinaryStatus } from '../../types';

/** @license SPDX-License-Identifier: Apache-2.0 */

interface StudentRowData {
  id: string;
  full_name: string;
  course_id: string;
  teacher_id: string;
  status: string;
  annotations_count: number;
  positive_annotations_count: number;
  last_annotation_date?: string;
  disciplinary_status: DisciplinaryStatus;
  rut?: string;
  course_name?: string;
}

const DISC_STATUS: Record<string, { text: string; bg: string }> = {
  Verde: { text: 'Sin medida activa', bg: 'bg-emerald-100 text-emerald-800' },
  Amarillo: { text: 'Amonestación Escrita', bg: 'bg-yellow-100 text-yellow-800' },
  Naranja: { text: 'Carta de Compromiso Conductual', bg: 'bg-orange-100 text-orange-800' },
  Rojo: { text: 'Derivación a Convivencia Escolar', bg: 'bg-rose-100 text-rose-800' },
};

const getDisciplinaryStatusLabel = (count: number): { text: string; bg: string } => {
  if (count < 5) { return DISC_STATUS.Verde; }
  if (count < 10) { return DISC_STATUS.Amarillo; }
  if (count < 15) { return DISC_STATUS.Naranja; }
  return DISC_STATUS.Rojo;
};

interface AnotacionesStudentTableProps {
  students: StudentRowData[];
  privacyMode: boolean;
  onSelectStudent: (student: StudentRowData) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
}

const FILTER_TABS = [
  { key: 'con_registro', label: 'Con Registro' },
  { key: 'amonestacion', label: 'Amonestación' },
  { key: 'compromiso', label: 'Compromiso' },
  { key: 'derivacion', label: 'Derivación' },
];

function getAnnotationRange(filter: string): [number, number] | null {
  switch (filter) {
    case 'con_registro': return [5, Number.POSITIVE_INFINITY];
    case 'amonestacion': return [5, 9];
    case 'compromiso': return [10, 14];
    case 'derivacion': return [15, Number.POSITIVE_INFINITY];
    default: return null;
  }
}

function filterStudents(
  students: AnotacionesStudentTableProps['students'],
  activeFilter: string,
  searchQuery: string
) {
  let filtered = students;

  const range = getAnnotationRange(activeFilter);
  if (range) {
    const [min, max] = range;
    filtered = filtered.filter((s) => {
      const count = s.annotations_count || 0;
      return count >= min && count <= max;
    });
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.rut?.toLowerCase().includes(q)) ||
        (s.course_name?.toLowerCase().includes(q))
    );
  }

  return filtered;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) { return '—'; }
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default memo(function AnotacionesStudentTable({
  students,
  privacyMode,
  onSelectStudent,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  isLoading,
}: AnotacionesStudentTableProps) {
  const filteredStudents = filterStudents(students, activeFilter, searchQuery);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar estudiante, RUT o curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-4 pl-10 font-medium text-neutral-800 text-sm transition-all placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 font-semibold text-sm transition-all duration-150 ${
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
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Estudiante
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider md:table-cell">
                  RUT
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider md:table-cell">
                  Curso
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider lg:table-cell">
                  Profesor/a Jefe
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
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                      Cargando estudiantes...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500 text-sm">
                    No se encontraron estudiantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const style = getSemaphoricStyle(student.annotations_count || 0);
                  const status = getDisciplinaryStatusLabel(student.annotations_count || 0);
                  const negativeCount = student.annotations_count || 0;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => onSelectStudent(student)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectStudent(student); } }}
                      tabIndex={0}
                      className={`cursor-pointer transition-colors ${style.rowBg}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 text-sm">
                        {maskName(student.full_name, privacyMode)}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm md:table-cell">
                        {maskRut(student.rut, privacyMode)}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm md:table-cell">
                        {student.course_name || '—'}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm lg:table-cell">
                        {TEACHERS_BY_COURSE[student.course_name ?? ''] || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-neutral-600 text-sm">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 text-xs">
                          {Number(student.positive_annotations_count) || 0}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-neutral-600 text-sm">
                        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold text-xs ${style.badge}`}>
                          {negativeCount}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm lg:table-cell">
                        {formatDate(student.last_annotation_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium text-xs ${status.bg}`}>
                          <span className={`inline-block size-2 rounded-full ${style.dot}`} />
                          <span className="hidden md:inline">{status.text}</span>
                        </span>
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
          Mostrando{' '}
          <span className="font-medium text-neutral-700">{filteredStudents.length}</span>
          {' '}de{' '}
          <span className="font-medium text-neutral-700">{students.length}</span>
          {' '}estudiantes
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-neutral-500 text-xs">Leyenda:</span>
          <span className="inline-flex items-center gap-1 text-neutral-600 text-xs">
            <span className="inline-block size-2.5 rounded-full bg-yellow-500" />
            Amarillo (5–9)
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-600 text-xs">
            <span className="inline-block size-2.5 rounded-full bg-orange-500" />
            Naranja (10–14)
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-600 text-xs">
            <span className="inline-block size-2.5 rounded-full bg-rose-500" />
            Rojo (15+)
          </span>
        </div>
      </div>
    </div>
  );
});

