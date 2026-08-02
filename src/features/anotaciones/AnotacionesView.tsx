/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, lazy, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus } from 'lucide-react';
import type { Annotation, AnotacionStudent } from '../../types';
import {
  fetchAnnotations,
  fetchStudentsWithAnnotationCounts,
} from '../../services/annotations.service';
import { fetchCartaTableStates } from '../../services/cartas.service';
import { getStudentCartaWorkflowLabel } from '../../shared/lib/domain/disciplinaryStage';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import { AnnotationsSkeleton } from '../../components/Skeleton';
import type { ActiveTab } from './AnotacionesStudentDetailModal/constants';
import Button from '@/src/shared/ui/Button';
import { useAuthStore } from '../../stores/authStore';

const AnotacionesStudentDetailModal = lazy(() => import('./AnotacionesStudentDetailModal'));
const NewDisciplinaryProcessModal = lazy(() => import('./NewDisciplinaryProcessModal'));

interface AnotacionesViewProps {
  privacyMode: boolean;
}

export default function AnotacionesView({ privacyMode }: AnotacionesViewProps) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<AnotacionStudent | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<ActiveTab>('estado');
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('con_registro');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const studentsQuery = useQuery({
    queryKey: ['anotaciones', 'students', tenantId],
    queryFn: fetchStudentsWithAnnotationCounts,
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60 * 5,
  });
  const cartaStatesQuery = useQuery({
    queryKey: ['anotaciones', 'carta-states', tenantId],
    queryFn: fetchCartaTableStates,
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60 * 5,
  });
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const cartaStatuses = useMemo(() => {
    const statuses: Record<string, string[]> = {};
    for (const student of students) {
      const cartaStatus = getStudentCartaWorkflowLabel(
        student.annotations_count,
        cartaStatesQuery.data?.[student.id],
      );
      if (cartaStatus) statuses[student.id] = [cartaStatus];
    }
    return statuses;
  }, [cartaStatesQuery.data, students]);
  const annotationsQuery = useQuery({
    queryKey: ['anotaciones', 'student', tenantId, selectedStudent?.id],
    queryFn: () => fetchAnnotations(selectedStudent?.id),
    enabled: Boolean(tenantId && selectedStudent?.id),
    staleTime: 1000 * 60 * 5,
  });
  const isLoading = studentsQuery.isLoading;
  const dbError = studentsQuery.error instanceof Error ? studentsQuery.error.message : null;
  const loadData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['anotaciones', 'students', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['anotaciones', 'carta-states', tenantId] }),
    ]);
  }, [queryClient, tenantId]);
  const refreshStudentTable = loadData;

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
          annotations={(annotationsQuery.data ?? []).filter(
            (annotation: Annotation) => annotation.student_id === selectedStudent.id,
          )}
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
