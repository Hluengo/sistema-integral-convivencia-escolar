/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Users, Search, GraduationCap, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { fetchCourses, fetchStudentsWithCourses, type Course, type StudentWithCourse } from '../lib/supabase';

interface StudentsPanelProps {
  privacyMode: boolean;
}

export default function StudentsPanel({ privacyMode }: StudentsPanelProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [coursesData, studentsData] = await Promise.all([
          fetchCourses(),
          fetchStudentsWithCourses(),
        ]);
        setCourses(coursesData);
        setStudents(studentsData);
      } catch {
        setError('No se pudieron cargar los estudiantes. Verifique la conexión con Supabase.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedCourseId !== 'all' && s.course_id !== selectedCourseId) return false;
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

  const groupedByCourse = useMemo(() => {
    const groups = new Map<string, { course: Course | null; students: StudentWithCourse[] }>();
    for (const student of filteredStudents) {
      const key = student.course_id;
      if (!groups.has(key)) {
        const course = courses.find((c) => c.id === key) ?? null;
        groups.set(key, { course, students: [] });
      }
      groups.get(key)!.students.push(student);
    }
    return Array.from(groups.values()).sort((a, b) => {
      const posA = a.course?.position ?? 999;
      const posB = b.course?.position ?? 999;
      return posA - posB;
    });
  }, [filteredStudents, courses]);

  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section aria-label="Gestión de alumnos" className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 sm:p-8 text-white shadow-lg">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200/80 text-xs font-semibold uppercase tracking-wider mb-1">
              Matrícula · Supabase
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Estudiantes</h2>
            <p className="text-blue-100/80 text-sm mt-2 capitalize">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center ring-1 ring-white/20">
              <p className="text-2xl font-bold tabular-nums">{students.length}</p>
              <p className="text-[10px] text-blue-200/80 font-semibold uppercase tracking-wider">Total</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center ring-1 ring-white/20">
              <p className="text-2xl font-bold tabular-nums">{courses.length}</p>
              <p className="text-[10px] text-blue-200/80 font-semibold uppercase tracking-wider">Cursos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, RUN o curso..."
              className="w-full bg-neutral-50 text-neutral-800 pl-10 pr-4 py-2.5 text-sm font-medium rounded-xl border border-neutral-200/80 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all"
              aria-label="Buscar estudiantes"
            />
          </div>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="sm:w-56 bg-neutral-50 text-neutral-800 px-4 py-2.5 text-sm font-medium rounded-xl border border-neutral-200/80 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            aria-label="Filtrar por curso"
          >
            <option value="all">Todos los cursos</option>
            {courses.filter((c) => c.level === 'BASICA').length > 0 && (
              <optgroup label="Enseñanza Básica">
                {courses.filter((c) => c.level === 'BASICA').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )}
            {courses.filter((c) => c.level === 'MEDIA').length > 0 && (
              <optgroup label="Enseñanza Media">
                {courses.filter((c) => c.level === 'MEDIA').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card p-12 flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
          <p className="text-sm font-medium">Cargando estudiantes desde Supabase...</p>
        </div>
      ) : error ? (
        <div className="card p-8 flex items-start gap-3 bg-gravisima-50 border-gravisima-200">
          <AlertCircle className="h-5 w-5 text-gravisima-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-gravisima-800">Error de conexión</p>
            <p className="text-xs text-gravisima-700 mt-1">{error}</p>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="h-10 w-10 text-neutral-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-neutral-600">No se encontraron estudiantes</p>
          <p className="text-xs text-neutral-400 mt-1">
            {students.length === 0
              ? 'La tabla students está vacía en Supabase.'
              : 'Pruebe con otro filtro o término de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {groupedByCourse.map(({ course, students: courseStudents }) => (
            <div key={course?.id ?? 'unknown'} className="card overflow-hidden">
              <div className="relative px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
                <div
                  className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-brand-600"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-50">
                    <GraduationCap className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {course?.name ?? 'Sin curso asignado'}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-medium">
                      {course?.level === 'BASICA' ? 'Enseñanza Básica' : course?.level === 'MEDIA' ? 'Enseñanza Media' : ''}
                      {' · '}{courseStudents.length} estudiante{courseStudents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="px-5 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Nombre</th>
                      <th className="px-5 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">RUN</th>
                      <th className="px-5 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider hidden sm:table-cell">Curso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50/80 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 text-[10px] font-bold shrink-0">
                              {student.full_name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('')}
                            </div>
                            <span className="text-sm font-semibold text-neutral-900">
                              {privacyMode
                                ? student.full_name.split(' ').filter((w) => w.length > 2).map((w) => w[0] + '.').join(' ')
                                : student.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-mono font-medium text-neutral-600">
                            {privacyMode ? 'XX.XXX.XXX-X' : student.rut}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200/60">
                            <BookOpen className="h-3 w-3" aria-hidden="true" />
                            {student.course_name}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
