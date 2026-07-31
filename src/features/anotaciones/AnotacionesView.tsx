/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useCallback, lazy } from 'react';
import { Shield, Plus } from 'lucide-react';
import type { Annotation, AnotacionStudent } from '../../types';
import {
  fetchAnnotations,
  fetchStudentsWithAnnotationCounts,
} from '../../services/annotations.service';
import { fetchCartaTableStates } from '../../services/cartas.service';
import {
  getEffectiveDisciplinaryStage,
  getStudentCartaWorkflowLabel,
} from '../../shared/lib/domain/disciplinaryStage';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import { AnnotationsSkeleton } from '../../components/Skeleton';
import type { ActiveTab } from './AnotacionesStudentDetailModal/constants';
import Button from '@/src/shared/ui/Button';

const AnotacionesStudentDetailModal = lazy(() => import('./AnotacionesStudentDetailModal'));
const NewDisciplinaryProcessModal = lazy(() => import('./NewDisciplinaryProcessModal'));

interface AnotacionesViewProps {
  privacyMode: boolean;
}

async function fetchAnotacionesTableData(): Promise<{
  students: AnotacionStudent[];
  cartaStatuses: Record<string, string[]>;
}> {
  const [fetchedStudents, cartaStates] = await Promise.all([
    fetchStudentsWithAnnotationCounts(),
    fetchCartaTableStates(),
  ]);
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
  return { students, cartaStatuses };
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const tableData = await fetchAnotacionesTableData();
      setStudents(tableData.students);
      setCartaStatuses(tableData.cartaStatuses);
    } catch (error: unknown) {
      console.error('Error cargando datos desde Supabase:', error);
      setDbError(error instanceof Error ? error.message : 'Error de conexión con la base de datos');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshStudentTable = useCallback(async () => {
    try {
      const tableData = await fetchAnotacionesTableData();
      const nextStudents = tableData.students;
      setStudents(nextStudents);
      setCartaStatuses(tableData.cartaStatuses);
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
          <Button
            variant="custom"
            onClick={() => setIsNewProcessModalOpen(true)}
            className="shrink-0 rounded-xl bg-secondary-500 px-5 py-3 text-white shadow-md shadow-secondary-500/30 hover:bg-secondary-600 active:scale-[0.97]"
            aria-label="Crear nuevo proceso"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proceso
          </Button>
        </div>
      </div>

      {/* DB Error Alert */}
      {dbError && (
        <div className="flex items-start gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 shadow-sm">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-gravisima-500" />
          <div className="space-y-1 text-gravisima-700 text-xs">
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
      />

      {/* Student Detail Modal */}
      {selectedStudent && (
        <AnotacionesStudentDetailModal
          student={selectedStudent}
          annotations={annotations.filter((a) => a.student_id === selectedStudent.id)}
          privacyMode={privacyMode}
          initialTab={detailInitialTab}
          onClose={() => setSelectedStudent(null)}
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
