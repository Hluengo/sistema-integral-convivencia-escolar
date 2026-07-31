/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useCallback, lazy } from 'react';
import { Shield, Plus } from 'lucide-react';
import type { Annotation, AnotacionStudent } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  fetchAnnotations,
  fetchStudentsWithAnnotationCountsPage,
} from '../../services/annotations.service';
import { fetchCartaTableStates } from '../../services/cartas.service';
import {
  getEffectiveDisciplinaryStage,
  getStudentCartaWorkflowLabel,
} from '../../shared/lib/domain/disciplinaryStage';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import { AnnotationsSkeleton } from '../../components/Skeleton';
import type { ActiveTab } from './AnotacionesStudentDetailModal/constants';

const AnotacionesStudentDetailModal = lazy(() => import('./AnotacionesStudentDetailModal'));
const NewDisciplinaryProcessModal = lazy(() => import('./NewDisciplinaryProcessModal'));

interface AnotacionesViewProps {
  privacyMode: boolean;
}

const ANNOTATIONS_PAGE_SIZE = 25;

async function fetchAnotacionesTableData(offset = 0): Promise<{
  students: AnotacionStudent[];
  cartaStatuses: Record<string, string[]>;
  nextOffset?: number;
}> {
  const studentPage = await fetchStudentsWithAnnotationCountsPage(offset, ANNOTATIONS_PAGE_SIZE);
  const fetchedStudents = studentPage.students;
  const cartaStates = await fetchCartaTableStates(fetchedStudents.map((student) => student.id));
  const cartaStatuses: Record<string, string[]> = {};
  const students = (fetchedStudents ?? []).map((student) => {
    const cartaState = cartaStates[student.id];
    const completedLetterType = cartaState?.completedLetterType ?? null;
    const stage = getEffectiveDisciplinaryStage(student.annotations_count, completedLetterType);
    const cartaStatus = getStudentCartaWorkflowLabel(student.annotations_count, cartaState);
    if (cartaStatus) cartaStatuses[student.id] = [cartaStatus];
    return {
      ...student,
      effective_letter_type: completedLetterType,
      disciplinary_status:
        stage.key === 'derivacion'
          ? ('Rojo' as const)
          : stage.key === 'compromiso_conductual'
            ? ('Naranja' as const)
            : stage.key === 'amonestacion'
              ? ('Amarillo' as const)
              : ('Verde' as const),
    };
  });
  return { students, cartaStatuses, nextOffset: studentPage.nextOffset };
}

export default function AnotacionesView({ privacyMode }: AnotacionesViewProps) {
  const [students, setStudents] = useState<AnotacionStudent[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<AnotacionStudent | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<ActiveTab>('estado');
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('con_registro');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbError, setDbError] = useState<string | null>(null);
  const [cartaStatuses, setCartaStatuses] = useState<Record<string, string[]>>({});
  const [nextStudentOffset, setNextStudentOffset] = useState<number | undefined>(undefined);
  const [isLoadingMoreStudents, setIsLoadingMoreStudents] = useState(false);
  const hasMoreStudents = nextStudentOffset !== undefined;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const tableData = await fetchAnotacionesTableData();
      setStudents(tableData.students);
      setCartaStatuses(tableData.cartaStatuses);
      setNextStudentOffset(tableData.nextOffset);
    } catch (error: unknown) {
      console.error('Error cargando datos desde Supabase:', error);
      setDbError(error instanceof Error ? error.message : 'Error de conexión con la base de datos');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreStudents = useCallback(async () => {
    if (nextStudentOffset === undefined || isLoadingMoreStudents) return;

    setIsLoadingMoreStudents(true);
    setDbError(null);
    try {
      const tableData = await fetchAnotacionesTableData(nextStudentOffset);
      setStudents((current) => {
        const knownStudentIds = new Set(current.map((student) => student.id));
        return [
          ...current,
          ...tableData.students.filter((student) => !knownStudentIds.has(student.id)),
        ];
      });
      setCartaStatuses((current) => ({ ...current, ...tableData.cartaStatuses }));
      setNextStudentOffset(tableData.nextOffset);
    } catch (error: unknown) {
      console.error('Error cargando más estudiantes:', error);
      setDbError(
        error instanceof Error
          ? error.message
          : 'Error al cargar más estudiantes desde la base de datos',
      );
    } finally {
      setIsLoadingMoreStudents(false);
    }
  }, [isLoadingMoreStudents, nextStudentOffset]);

  const refreshStudentTable = useCallback(async () => {
    try {
      const tableData = await fetchAnotacionesTableData();
      const nextStudents = tableData.students;
      setStudents(nextStudents);
      setCartaStatuses(tableData.cartaStatuses);
      setNextStudentOffset(tableData.nextOffset);
      setSelectedStudent((current) =>
        current ? nextStudents.find((student) => student.id === current.id) || current : null,
      );
    } catch (error: unknown) {
      console.error('Error actualizando la tabla de anotaciones:', error);
      setDbError(
        error instanceof Error ? error.message : 'Error al actualizar la tabla de anotaciones',
      );
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
    [loadData, selectedStudent, students],
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
        onSelectStudent={(student) => {
          setDetailInitialTab('estado');
          setSelectedStudent(student);
        }}
        onEditAnnotations={(student) => {
          setDetailInitialTab('editar_anotaciones');
          setSelectedStudent(student);
        }}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
        cartaStatuses={cartaStatuses}
        hasMoreStudents={hasMoreStudents}
        isLoadingMoreStudents={isLoadingMoreStudents}
        onLoadMoreStudents={loadMoreStudents}
      />

      {/* Student Detail Modal */}
      {selectedStudent && (
        <AnotacionesStudentDetailModal
          student={selectedStudent}
          annotations={annotations.filter((a) => a.student_id === selectedStudent.id)}
          privacyMode={privacyMode}
          initialTab={detailInitialTab}
          onClose={() => setSelectedStudent(null)}
          onClearAnnotations={() => handleClearAnnotations(selectedStudent.id)}
          onDataChanged={refreshStudentTable}
        />
      )}

      {/* New Process Modal */}
      {isNewProcessModalOpen && (
        <NewDisciplinaryProcessModal
          students={students}
          onClose={() => setIsNewProcessModalOpen(false)}
          currentUserEmail=""
          onProcessCreated={loadData}
          onOpenExistingStudent={(studentId) => {
            const student = students.find((candidate) => candidate.id === studentId);
            if (!student) return;
            setIsNewProcessModalOpen(false);
            setDetailInitialTab('historial');
            setSelectedStudent(student);
          }}
        />
      )}
    </div>
  );
}
