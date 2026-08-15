/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useReducer, useMemo, useState, useCallback } from 'react';
import {
  Users,
  Search,
  GraduationCap,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import Button from '@/shared/ui/Button';
import PageHeader from '@/shared/ui/PageHeader';
import type { Course, StudentActivitySummary } from '../../shared/api/services/courses.service';
import { TableSkeleton } from '../../shared/Skeleton';
import { useCoursesQuery } from '../../shared/lib/hooks/useCoursesQuery';
import { usePaginatedStudentActivityHistoryQuery } from '../../shared/lib/hooks/useStudentsQuery';

const EMPTY_COURSES: Course[] = [];
const EMPTY_STUDENTS: StudentActivitySummary[] = [];

interface StudentsPanelProps {
  privacyMode: boolean;
}

// ── useReducer state & actions ────────────────────────────────────────────────

interface StudentsPanelState {
  searchQuery: string;
  selectedCourseId: string;
}

type StudentsPanelAction =
  { type: 'SET_SEARCH'; query: string } | { type: 'SET_COURSE'; courseId: string };

const initialState: StudentsPanelState = {
  searchQuery: '',
  selectedCourseId: 'all',
};

function reducer(state: StudentsPanelState, action: StudentsPanelAction): StudentsPanelState {
  switch (action.type) {
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
  const { searchQuery, selectedCourseId } = state;
  const coursesQuery = useCoursesQuery();
  const studentsQuery = usePaginatedStudentActivityHistoryQuery();
  const courses = coursesQuery.data ?? EMPTY_COURSES;
  const students = useMemo(
    () => studentsQuery.data?.pages.flatMap((page) => page.students) ?? EMPTY_STUDENTS,
    [studentsQuery.data],
  );
  const totalStudents = studentsQuery.data?.pages[0]?.totalCount ?? students.length;
  const activityTotals = useMemo(
    () =>
      students.reduce(
        (totals, student) => ({
          openCauses: totals.openCauses + student.active_cause_count,
          annotations: totals.annotations + student.annotation_count,
        }),
        { openCauses: 0, annotations: 0 },
      ),
    [students],
  );
  const isLoading = coursesQuery.isLoading || studentsQuery.isLoading;
  const error =
    coursesQuery.isError || studentsQuery.isError
      ? 'No se pudieron cargar los estudiantes. Verifique la conexión con Supabase.'
      : null;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedCourseId !== 'all' && s.course_id !== selectedCourseId) {
        return false;
      }
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

  const basicCourses = useMemo(() => courses.filter((c) => c.level === 'BASICA'), [courses]);
  const mediaCourses = useMemo(() => courses.filter((c) => c.level === 'MEDIA'), [courses]);

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const groupedByCourse = useMemo(() => {
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const groups = new Map<
      string,
      {
        course: Course | null;
        students: StudentActivitySummary[];
        openCauses: number;
        annotations: number;
      }
    >();
    for (const student of filteredStudents) {
      const key = student.course_id;
      if (!groups.has(key)) {
        const course = courseById.get(key) ?? null;
        groups.set(key, { course, students: [], openCauses: 0, annotations: 0 });
      }
      const group = groups.get(key);
      if (group) {
        group.students.push(student);
        group.openCauses += student.active_cause_count;
        group.annotations += student.annotation_count;
      }
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
    const allIds = groupedByCourse.reduce<Set<string>>((acc, g) => {
      if (g.course?.id) acc.add(g.course.id);
      return acc;
    }, new Set());
    setExpandedCourses(allIds);
  }, [groupedByCourse]);

  const collapseAll = useCallback(() => {
    setExpandedCourses(new Set());
  }, []);

  const allExpanded =
    groupedByCourse.length > 0 &&
    groupedByCourse.every((g) => expandedCourses.has(g.course?.id ?? ''));

  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formatActivityDate = useCallback((value: string | null) => {
    if (!value) return 'Sin actividad';
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }, []);

  return (
    <section aria-label="Gestión de alumnos" className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Matrícula"
        title="Estudiantes"
        description={`${todayLabel} · Historial con causas o anotaciones`}
        action={
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center">
              <p className="font-bold text-neutral-950 text-xl tabular-nums">{totalStudents}</p>
              <p className="font-semibold text-10px text-neutral-500 uppercase">Estudiantes</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center">
              <p className="font-bold text-grave-700 text-xl tabular-nums">
                {activityTotals.openCauses}
              </p>
              <p className="font-semibold text-10px text-grave-700 uppercase">Abiertas</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center">
              <p className="font-bold text-muygrave-700 text-xl tabular-nums">
                {activityTotals.annotations}
              </p>
              <p className="font-semibold text-10px text-muygrave-700 uppercase">Anotaciones</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center">
              <p className="font-bold text-neutral-950 text-xl tabular-nums">{courses.length}</p>
              <p className="font-semibold text-10px text-neutral-500 uppercase">Cursos</p>
            </div>
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="text"
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
              placeholder="Buscar por nombre, RUN o curso..."
              className="w-full rounded-xl border border-neutral-200/60 bg-neutral-50 py-2.5 pr-4 pl-10 font-medium text-neutral-800 text-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Buscar estudiantes"
            />
          </div>
          <select
            value={selectedCourseId}
            onChange={(e) => dispatch({ type: 'SET_COURSE', courseId: e.target.value })}
            className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-2.5 font-medium text-neutral-800 text-sm transition-colors hover:border-neutral-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:w-56"
            aria-label="Filtrar por curso"
          >
            <option value="all">Todos los cursos</option>
            {basicCourses.length > 0 && (
              <optgroup label="Enseñanza Básica">
                {basicCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {mediaCourses.length > 0 && (
              <optgroup label="Enseñanza Media">
                {mediaCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {groupedByCourse.length > 0 && (
            <Button
              variant="secondary"
              aria-label={allExpanded ? 'Colapsar todos los cursos' : 'Expandir todos los cursos'}
              onClick={allExpanded ? collapseAll : expandAll}
              className="rounded-xl px-3.5 py-2.5 text-xs"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? 'Colapsar todos' : 'Expandir todos'}
            </Button>
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
            <p className="font-semibold text-gravisima-700 text-sm">Error de conexión</p>
            <p className="mt-1 text-gravisima-700 text-xs">{error}</p>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden="true" />
          <p className="font-medium text-neutral-600 text-sm">No se encontraron estudiantes</p>
          <p className="mt-1 text-neutral-400 text-xs">
            {students.length === 0
              ? 'No hay estudiantes con causas o anotaciones registradas.'
              : 'Pruebe con otro filtro o término de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="stagger-children space-y-4">
          {groupedByCourse.map(
            ({ course, students: courseStudents, openCauses, annotations }, gi) => {
              const courseId = course?.id ?? `unknown-${gi}`;
              const isExpanded =
                expandedCourses.has(courseId) ||
                selectedCourseId !== 'all' ||
                searchQuery.trim() !== '';
              const courseContentId = `students-course-${courseId}`;
              return (
                <div key={courseId} className="card overflow-hidden">
                  <button
                    type="button"
                    aria-label={`Alternar curso ${course?.name ?? 'sin nombre'}`}
                    aria-expanded={isExpanded}
                    aria-controls={courseContentId}
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
                        <p className="font-medium text-11px text-neutral-400">
                          {course?.level === 'BASICA'
                            ? 'Enseñanza Básica'
                            : course?.level === 'MEDIA'
                              ? 'Enseñanza Media'
                              : 'Sin nivel'}
                          {' · '}
                          {courseStudents.length} estudiante{courseStudents.length !== 1 ? 's' : ''}
                          {' · '}
                          <span
                            className={openCauses > 0 ? 'font-semibold text-grave-700' : undefined}
                          >
                            {openCauses} abierta{openCauses !== 1 ? 's' : ''}
                          </span>
                          {' · '}
                          {annotations} anotación{annotations !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-neutral-200 p-1">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-600" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div id={courseContentId}>
                      <div className="space-y-2 p-3 sm:hidden">
                        {courseStudents.map((student) => (
                          <article
                            key={student.id}
                            className="rounded-xl border border-neutral-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-neutral-900 text-sm">
                                  {privacyMode
                                    ? student.full_name
                                        .split(' ')
                                        .filter((w) => w.length > 2)
                                        .map((w) => `${w[0]}.`)
                                        .join(' ')
                                    : student.full_name}
                                </p>
                                <p className="mt-0.5 font-mono text-neutral-500 text-xs">
                                  {privacyMode ? 'XX.XXX.XXX-X' : student.rut}
                                </p>
                              </div>
                              <span className="shrink-0 text-neutral-400 text-xs">
                                {formatActivityDate(student.last_activity_at)}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5 text-11px">
                              <span className="rounded-md bg-grave-50 px-2 py-1 font-semibold text-grave-700">
                                {student.active_cause_count} abiertas
                              </span>
                              <span className="rounded-md bg-brand-50 px-2 py-1 font-semibold text-brand-700">
                                {student.cause_count} causa{student.cause_count !== 1 ? 's' : ''}
                              </span>
                              <span className="rounded-md bg-muygrave-50 px-2 py-1 font-semibold text-muygrave-700">
                                {student.annotation_count} anotación
                                {student.annotation_count !== 1 ? 'es' : ''}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-neutral-100 border-b">
                              <th className="px-5 py-3 font-semibold text-10px text-neutral-400 uppercase">
                                Nombre
                              </th>
                              <th className="px-5 py-3 font-semibold text-10px text-neutral-400 uppercase">
                                RUN
                              </th>
                              <th className="hidden px-5 py-3 font-semibold text-10px text-neutral-400 uppercase sm:table-cell">
                                Curso
                              </th>
                              <th className="px-5 py-3 font-semibold text-10px text-neutral-400 uppercase">
                                Actividad
                              </th>
                              <th className="hidden px-5 py-3 font-semibold text-10px text-neutral-400 uppercase md:table-cell">
                                Última actividad
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {courseStudents.map((student) => (
                              <tr
                                key={student.id}
                                className="border-neutral-50 border-b transition-colors last:border-b-0 hover:bg-neutral-50/80"
                              >
                                <td className="px-5 py-3" aria-label="Nombre del estudiante">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-100 to-brand-200 font-bold text-10px text-brand-700">
                                      {student.full_name
                                        .split(' ')
                                        .filter((w) => w.length > 2)
                                        .slice(0, 2)
                                        .map((w) => w[0])
                                        .join('')}
                                    </div>
                                    <span className="font-semibold text-neutral-900 text-sm">
                                      {privacyMode
                                        ? student.full_name
                                            .split(' ')
                                            .filter((w) => w.length > 2)
                                            .map((w) => `${w[0]}.`)
                                            .join(' ')
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
                                  <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200/60 bg-neutral-50 px-2 py-0.5 font-medium text-11px text-neutral-500">
                                    <BookOpen className="h-3 w-3" aria-hidden="true" />
                                    {student.course_name}
                                  </span>
                                </td>
                                <td className="px-5 py-3" aria-label="Actividad del estudiante">
                                  <div className="flex flex-wrap gap-1.5 text-11px">
                                    <span className="rounded-md bg-grave-50 px-2 py-0.5 font-semibold text-grave-700">
                                      {student.active_cause_count} abiertas
                                    </span>
                                    <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                                      {student.cause_count} causa
                                      {student.cause_count !== 1 ? 's' : ''}
                                    </span>
                                    <span className="rounded-md bg-grave-50 px-2 py-0.5 font-semibold text-grave-700">
                                      {student.annotation_count} anotación
                                      {student.annotation_count !== 1 ? 'es' : ''}
                                    </span>
                                  </div>
                                </td>
                                <td className="hidden px-5 py-3 text-neutral-500 text-xs md:table-cell">
                                  {formatActivityDate(student.last_activity_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          )}
          {studentsQuery.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                onClick={() => void studentsQuery.fetchNextPage()}
                disabled={studentsQuery.isFetchingNextPage}
              >
                {studentsQuery.isFetchingNextPage ? 'Cargando…' : 'Cargar más estudiantes'}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
