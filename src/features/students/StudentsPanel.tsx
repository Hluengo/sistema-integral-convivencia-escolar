/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useReducer, useMemo, useState, useCallback } from 'react';
import { Users, Search, GraduationCap, Loader2, AlertCircle, BookOpen, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { fetchCourses, fetchStudentsWithCourses, type Course, type StudentWithCourse } from '../../services/courses.service';
import { TableSkeleton } from '../../components/Skeleton';

interface StudentsPanelProps {
  privacyMode: boolean;
}

// ── useReducer state & actions ────────────────────────────────────────────────

interface StudentsPanelState {
  courses: Course[];
  students: StudentWithCourse[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCourseId: string;
}

type StudentsPanelAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; courses: Course[]; students: StudentWithCourse[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_COURSE'; courseId: string };

const initialState: StudentsPanelState = {
  courses: [],
  students: [],
  isLoading: true,
  error: null,
  searchQuery: '',
  selectedCourseId: 'all',
};

function reducer(state: StudentsPanelState, action: StudentsPanelAction): StudentsPanelState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_SUCCESS':
      return { ...state, isLoading: false, courses: action.courses, students: action.students };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'SET_COURSE':
      return { ...state, selectedCourseId: action.courseId };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StudentsPanel({ privacyMode }: StudentsPanelProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { courses, students, isLoading, error, searchQuery, selectedCourseId } = state;

  useEffect(() => {
    async function load() {
      dispatch({ type: 'LOAD_START' });
      try {
        const [coursesData, studentsData] = await Promise.all([
          fetchCourses(),
          fetchStudentsWithCourses(),
        ]);
        dispatch({ type: 'LOAD_SUCCESS', courses: coursesData, students: studentsData });
      } catch {
        dispatch({ type: 'LOAD_ERROR', error: 'No se pudieron cargar los estudiantes. Verifique la conexión con Supabase.' });
      }
    }
    load();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedCourseId !== 'all' && s.course_id !== selectedCourseId) { return false; }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.rut.toLowerCase().includes(q) ||
          s.course_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, selectedCourseId, searchQuery]);

  const basicCourses = useMemo(() => courses.filter(c => c.level === 'BASICA'), [courses]);
  const mediaCourses = useMemo(() => courses.filter(c => c.level === 'MEDIA'), [courses]);

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const groupedByCourse = useMemo(() => {
    const courseById = new Map(courses.map(c => [c.id, c]));
    const groups = new Map<string, { course: Course | null; students: StudentWithCourse[] }>();
    for (const student of filteredStudents) {
      const key = student.course_id;
      if (!groups.has(key)) {
        const course = courseById.get(key) ?? null;
        groups.set(key, { course, students: [] });
      }
      groups.get(key)?.students.push(student);
    }
    return Array.from(groups.values()).sort((a, b) => {
      const posA = a.course?.position ?? 999;
      const posB = b.course?.position ?? 999;
      return posA - posB;
    });
  }, [filteredStudents, courses]);

  const toggleCourse = useCallback((courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set(groupedByCourse.map((g) => g.course?.id).filter(Boolean) as string[]);
    setExpandedCourses(allIds);
  }, [groupedByCourse]);

  const collapseAll = useCallback(() => {
    setExpandedCourses(new Set());
  }, []);

  const allExpanded = groupedByCourse.length > 0 && groupedByCourse.every((g) => expandedCourses.has(g.course?.id ?? ''));

  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section aria-label="Gestión de alumnos" className="animate-fade-in space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
              Matrícula · Supabase
            </p>
            <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Estudiantes</h2>
            <p className="mt-2 text-blue-100/80 text-sm capitalize">{todayLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <p className="font-bold text-2xl tabular-nums">{students.length}</p>
              <p className="font-semibold text-[10px] text-blue-200/80 uppercase tracking-wider">Total</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <p className="font-bold text-2xl tabular-nums">{courses.length}</p>
              <p className="font-semibold text-[10px] text-blue-200/80 uppercase tracking-wider">Cursos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
<input
  type="text"
  spellCheck={false}
  value={searchQuery}
  onChange={(e) => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
  placeholder="Buscar por nombre, RUN o curso..."
  className="w-full rounded-xl border border-neutral-200/60 bg-neutral-50 py-2.5 pr-4 pl-10 font-medium text-neutral-800 text-sm transition-all placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
  aria-label="Buscar estudiantes"
/>
          </div>
          <select
            value={selectedCourseId}
            onChange={(e) => dispatch({ type: 'SET_COURSE', courseId: e.target.value })}
            className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 font-medium text-neutral-800 text-sm transition-all hover:border-neutral-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:w-56"
            aria-label="Filtrar por curso"
          >
            <option value="all">Todos los cursos</option>
            {basicCourses.length > 0 && (
              <optgroup label="Enseñanza Básica">
                {basicCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )}
            {mediaCourses.length > 0 && (
              <optgroup label="Enseñanza Media">
                {mediaCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          {groupedByCourse.length > 0 && (
            <button
              type="button"
              onClick={allExpanded ? collapseAll : expandAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 font-medium text-neutral-600 text-xs transition-colors hover:bg-neutral-50 hover:text-neutral-800"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? 'Colapsar todos' : 'Expandir todos'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <div className="card flex items-start gap-3 border-gravisima-200 bg-gravisima-50 p-8">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-gravisima-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-gravisima-800 text-sm">Error de conexión</p>
            <p className="mt-1 text-gravisima-700 text-xs">{error}</p>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
          <p className="font-medium text-neutral-600 text-sm">No se encontraron estudiantes</p>
          <p className="mt-1 text-neutral-400 text-xs">
            {students.length === 0
              ? 'La tabla students está vacía en Supabase.'
              : 'Pruebe con otro filtro o término de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="stagger-children space-y-4">
          {groupedByCourse.map(({ course, students: courseStudents }, gi) => {
            const courseId = course?.id ?? `unknown-${gi}`;
            const isExpanded = expandedCourses.has(courseId);
            return (
            <div key={courseId} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCourse(courseId)}
                className="relative w-full border-neutral-100 border-b bg-neutral-50/50 px-5 py-4 text-left transition-colors hover:bg-neutral-100/80"
              >
                <div
                  className="absolute top-0 right-4 left-4 h-[3px] rounded-full bg-brand-600"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-brand-50 p-2">
                    <GraduationCap className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-neutral-900 text-sm">
                      {course?.name ?? 'Sin curso asignado'}
                    </h3>
                    <p className="font-medium text-[11px] text-neutral-400">
                      {course?.level === 'BASICA' ? 'Enseñanza Básica' : course?.level === 'MEDIA' ? 'Enseñanza Media' : 'Sin nivel'}
                      {' · '}{courseStudents.length} estudiante{courseStudents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-neutral-200 p-1">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-neutral-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-600" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-neutral-100 border-b">
                      <th className="px-5 py-3 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider">Nombre</th>
                      <th className="px-5 py-3 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider">RUN</th>
                      <th className="hidden px-5 py-3 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider sm:table-cell">Curso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-neutral-50 border-b transition-colors last:border-b-0 hover:bg-neutral-50/80"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 font-bold text-[10px] text-brand-700">
                              {student.full_name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('')}
                            </div>
                            <span className="font-semibold text-neutral-900 text-sm">
                              {privacyMode
                                ? student.full_name.split(' ').filter((w) => w.length > 2).map((w) => `${w[0]}.`).join(' ')
                                : student.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium font-mono text-neutral-600 text-xs">
                            {privacyMode ? 'XX.XXX.XXX-X' : student.rut}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 sm:table-cell">
                          <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200/60 bg-neutral-50 px-2 py-0.5 font-medium text-[11px] text-neutral-500">
                            <BookOpen className="h-3 w-3" aria-hidden="true" />
                            {student.course_name}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
