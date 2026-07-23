/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useCallback, lazy } from 'react';
import { Shield, Plus } from 'lucide-react';
import type { Annotation, AnotacionStudent } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  fetchAnnotations,
  fetchStudentsWithAnnotationCounts,
} from '../../services/annotations.service';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import { AnnotationsSkeleton } from '../../components/Skeleton';

const AnotacionesStudentDetailModal = lazy(() => import('./AnotacionesStudentDetailModal'));
const NewDisciplinaryProcessModal = lazy(() => import('./NewDisciplinaryProcessModal'));

interface AnotacionesViewProps {
  privacyMode: boolean;
}

export default function AnotacionesView({ privacyMode }: AnotacionesViewProps) {
  const [students, setStudents] = useState<AnotacionStudent[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<AnotacionStudent | null>(null);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('con_registro');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbError, setDbError] = useState<string | null>(null);
  const [cartaStatuses, setCartaStatuses] = useState<Record<string, string[]>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const fetchedStudents = await fetchStudentsWithAnnotationCounts();
      setStudents(fetchedStudents ?? []);
      const { data: cartasData } = await supabase
        .from('cartas_disciplinarias')
        .select('student_id, status');
      const map: Record<string, string[]> = {};
      const seen = new Set<string>();
      for (const c of cartasData ?? []) {
        const key = `${c.student_id}:${c.status}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!map[c.student_id]) map[c.student_id] = [];
        map[c.student_id].push(c.status);
      }
      setCartaStatuses(map);
    } catch (error: unknown) {
      console.error('Error cargando datos desde Supabase:', error);
      setDbError(error instanceof Error ? error.message : 'Error de conexión con la base de datos');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedStudent) {
      setAnnotations([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const anns = await fetchAnnotations(selectedStudent.id);
      if (!cancelled) {
        setAnnotations(anns ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id, selectedStudent]);

  const handleClearAnnotations = useCallback(
    async (studentId: string) => {
      try {
        const { error } = await supabase
          .from('inspectorate_records')
          .delete()
          .eq('student_id', studentId);
        if (error) {
          throw error;
        }
        const { error: updateErr } = await supabase
          .from('document_analyses')
          .delete()
          .eq('student_id', studentId);
        if (updateErr) {
          console.error('Error limpiando document_analyses:', updateErr);
        }
        await loadData();
        if (selectedStudent && selectedStudent.id === studentId) {
          const fresh = students.find((s) => s.id === studentId);
          if (fresh) {
            setSelectedStudent(fresh);
          }
        }
      } catch (error: unknown) {
        console.error('Error limpiando anotaciones:', error);
        setDbError(error instanceof Error ? error.message : 'Error al limpiar anotaciones');
      }
    },
    [loadData, selectedStudent, students]
  );

  if (isLoading) {
    return <AnnotationsSkeleton />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero header - matches CausasView and StudentsPanel */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
              Convivencia Escolar · Debido Proceso
            </p>
            <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Anotaciones</h2>
            <p className="mt-2 text-blue-100/80 text-sm">
              Registro de anotaciones disciplinarias de estudiantes
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsNewProcessModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-5 py-3 font-semibold text-white shadow-md shadow-secondary-500/30 transition-colors hover:bg-secondary-600 active:scale-[0.97]"
            aria-label="Crear nuevo proceso"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proceso
          </button>
        </div>
      </div>

      {/* DB Error Alert */}
      {dbError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-red-50 p-4 shadow-sm">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-gravisima-500" />
          <div className="space-y-1 text-gravisima-800 text-xs">
            <p className="font-bold">Protección de Datos de NNA</p>
            <p className="leading-relaxed">
              No se pudo conectar con la base de datos. Los datos mostrados corresponden a
              información local. Los nombres y RUT de los estudiantes se encuentran protegidos por
              normativa de privacidad.
            </p>
            <p className="mt-1 font-mono text-[10px] text-gravisima-600">Error: {dbError}</p>
          </div>
        </div>
      )}

      {/* Student Table - full width */}
      <AnotacionesStudentTable
        students={students}
        privacyMode={privacyMode}
        onSelectStudent={(s) => setSelectedStudent(s)}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
        cartaStatuses={cartaStatuses}
      />

      {/* Student Detail Modal */}
      {selectedStudent && (
        <AnotacionesStudentDetailModal
          student={selectedStudent}
          annotations={annotations.filter((a) => a.student_id === selectedStudent.id)}
          privacyMode={privacyMode}
          onClose={() => setSelectedStudent(null)}
          onClearAnnotations={() => handleClearAnnotations(selectedStudent.id)}
        />
      )}

      {/* New Process Modal */}
      {isNewProcessModalOpen && (
        <NewDisciplinaryProcessModal
          students={students}
          onClose={() => setIsNewProcessModalOpen(false)}
          currentUserEmail=""
          onProcessCreated={loadData}
        />
      )}
    </div>
  );
}
