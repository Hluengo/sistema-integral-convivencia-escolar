/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Search, RefreshCw } from 'lucide-react';
import { maskName, maskRut, getSemaphoricStyle, TEACHERS_BY_COURSE } from '../../lib/anotacionesUtils';

/** @license SPDX-License-Identifier: Apache-2.0 */

const getDisciplinaryStatusLabel = (count: number): { text: string; bg: string } => {
  if (count < 5) return { text: 'Verde - Buen Comportamiento', bg: 'bg-emerald-100 text-emerald-800' };
  if (count < 10) return { text: 'Amarillo - Advertencia', bg: 'bg-yellow-100 text-yellow-800' };
  if (count < 15) return { text: 'Naranja - Compromiso', bg: 'bg-orange-100 text-orange-800' };
  return { text: 'Rojo - Alerta Crítica', bg: 'bg-rose-100 text-rose-800' };
};

interface AnotacionesStudentTableProps {
  students: Array<{
    id: string;
    full_name: string;
    course_id: string;
    teacher_id: string;
    annotations_count: number;
    positive_annotations_count: number;
    last_annotation_date?: string;
    disciplinary_status: string;
    rut?: string;
    course_name?: string;
  }>;
  privacyMode: boolean;
  onSelectStudent: (student: any) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const FILTER_TABS = [
  { key: 'amonestacion', label: 'Amonestación' },
  { key: 'compromiso', label: 'Compromiso' },
  { key: 'derivacion', label: 'Derivación' },
];

function getAnnotationRange(filter: string): [number, number] | null {
  switch (filter) {
    case 'con_registro': return [5, Infinity];
    case 'amonestacion': return [5, 9];
    case 'compromiso': return [10, 14];
    case 'derivacion': return [15, Infinity];
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
        (s.rut && s.rut.toLowerCase().includes(q)) ||
        (s.course_name && s.course_name.toLowerCase().includes(q))
    );
  }

  return filtered;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
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

export default function AnotacionesStudentTable({
  students,
  privacyMode,
  onSelectStudent,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  onRefresh,
  isLoading,
}: AnotacionesStudentTableProps) {
  const filteredStudents = filterStudents(students, activeFilter, searchQuery);

  return (
    <div className="space-y-4">
      {/* Search and Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar estudiante, RUT o curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Estudiante
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  RUT
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Curso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Profesor/a Jefe
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Positivas
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Negativas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Último Registro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-neutral-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-blue-500" />
                      Cargando estudiantes...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-neutral-500">
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
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                        {maskName(student.full_name, privacyMode)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {maskRut(student.rut, privacyMode)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {student.course_name || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {TEACHERS_BY_COURSE[student.course_name ?? ''] || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-neutral-600">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {student.positive_annotations_count ?? 0}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-neutral-600">
                        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                          {negativeCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600">
                        {formatDate(student.last_annotation_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.bg}`}>
                          <span className={`inline-block size-2 rounded-full ${style.dot}`} />
                          {status.text}
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
        <p className="text-sm text-neutral-500">
          Mostrando{' '}
          <span className="font-medium text-neutral-700">{filteredStudents.length}</span>
          {' '}de{' '}
          <span className="font-medium text-neutral-700">{students.length}</span>
          {' '}estudiantes
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-neutral-500">Leyenda:</span>
          <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
            <span className="inline-block size-2.5 rounded-full bg-yellow-500" />
            Amarillo (5–9)
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
            <span className="inline-block size-2.5 rounded-full bg-orange-500" />
            Naranja (10–14)
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
            <span className="inline-block size-2.5 rounded-full bg-rose-500" />
            Rojo (15+)
          </span>
        </div>
      </div>
    </div>
  );
}




