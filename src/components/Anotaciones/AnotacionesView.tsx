/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Plus, } from 'lucide-react';
import type { Annotation } from '../../types';
import { supabase, fetchAnnotations, fetchStudentsWithAnnotationCounts, saveAnnotation } from '../../lib/supabase';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import AnotacionesStudentDetailModal from './AnotacionesStudentDetailModal';
import NewDisciplinaryProcessModal from './NewDisciplinaryProcessModal';

const _TEACHERS_BY_COURSE: Record<string, string> = {
  '1° Básico A': 'CONSTANZA ESPINOZA MIRANDA',
  '1° Básico B': 'NATALIA ALBORNOZ RODRÍGUEZ',
  '2° Básico A': 'CAMILA GODOY VENEGAS',
  '2° Básico B': 'BELÉN FUENTES SALAZAR',
  '3° Básico A': 'ESPERANZA MORAGA SAINT JOUR',
  '3° Básico B': 'MARÍA OLIVIA GARCÉS',
  '4° Básico A': 'JAVIERA JOFRÉ SAN MARTÍN',
  '4° Básico B': 'CAROLINA RUÍZ RISOPATRÓN',
  '5° Básico A': 'PAMELA JARA GONZÁLEZ',
  '5° Básico B': 'VIVIANA SAAVEDRA BARRERA',
  '6° Básico A': 'SILVANA PINCHEIRA RODRÍGUEZ',
  '6° Básico B': 'ROSARIO SALINAS CAMPOS',
  '7° Básico A': 'MARCELO MUÑOZ PINO',
  '7° Básico B': 'MARÍA ISABEL MATUS RETAMAL',
  '8° Básico A': 'VANNIA RETAMAL SALGADO',
  '8° Básico B': 'PATRICIO ZAMBRANO ASENCIO',
  '1° Medio A': 'ESTER CONTRERAS ESPINOZA',
  '1° Medio B': 'MARITZA CARRASCO PALMA',
  '2° Medio A': 'PERCY ROCHA LUNA',
  '2° Medio B': 'JEREMY PÉREZ MUÑOZ',
  '3° Medio A': 'ANGELO FREIRE CONTRERAS',
  '3° Medio B': 'CAROLINA AGÜERO CÁRDENAS',
  '4° Medio A': 'VICENTE BURGOS ESTRADA',
  '4° Medio B': 'KEYLA RODRÍGUEZ SANHUEZA',
};

interface AnotacionesViewProps {
  privacyMode: boolean;
}

export default function AnotacionesView({ privacyMode }: AnotacionesViewProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('con_registro');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbError, setDbError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const fetchedStudents = await fetchStudentsWithAnnotationCounts();
      setStudents(fetchedStudents ?? []);
    } catch (error: any) {
      console.error('Error cargando datos desde Supabase:', error);
      setDbError(error?.message ?? 'Error de conexión con la base de datos');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedStudent) { setAnnotations([]); return; }
    let cancelled = false;
    (async () => {
      const anns = await fetchAnnotations(selectedStudent.id);
      if (!cancelled) { setAnnotations((anns ?? []) as unknown as Annotation[]); }
    })();
    return () => { cancelled = true; };
  }, [selectedStudent?.id, selectedStudent]);

  const handleAddAnnotations = useCallback(
    async (studentId: string, newAnnotations: Annotation[]) => {
      try {
        await Promise.all(newAnnotations.map(ann =>
          saveAnnotation({
            student_id: studentId,
            observation: ann.text || "",
            severity: ann.severity || "Leve",
            type: ann.type || "Negativa",
            registered_by: ann.registered_by || "Inspector\u00EDa",
          })
        ));
        await loadData();
        if (selectedStudent && selectedStudent.id === studentId) {
          const fresh = students.find((s: any) => s.id === studentId);
          if (fresh) { setSelectedStudent(fresh); }
        }
      } catch (error: any) {
        console.error('Error guardando anotaciones:', error);
        setDbError(error?.message ?? 'Error al guardar anotaciones');
      }
    },
    [loadData, selectedStudent, students],
  );

  const handleClearAnnotations = useCallback(
    async (studentId: string) => {
      try {
        const { error } = await supabase
          .from('annotations')
          .delete()
          .eq('student_id', studentId);
        if (error) { throw error; }
        await loadData();
        if (selectedStudent && selectedStudent.id === studentId) {
          const fresh = students.find((s: any) => s.id === studentId);
          if (fresh) { setSelectedStudent(fresh); }
        }
      } catch (error: any) {
        console.error('Error limpiando anotaciones:', error);
        setDbError(error?.message ?? 'Error al limpiar anotaciones');
      }
    },
    [loadData, selectedStudent, students],
  );

  const handleRegisterCase = useCallback(
    async (studentId: string, newAnnotations: any[], _fileData?: any) => {
      try {
        await Promise.all(newAnnotations.map(ann =>
          saveAnnotation({
            student_id: studentId,
            observation: ann.text || "",
            severity: ann.severity || "Leve",
            type: ann.type || "Negativa",
            registered_by: ann.registered_by || "Inspector\u00EDa",
          })
        ));
        await loadData();
      } catch (error: any) {
        console.error('Error registrando caso:', error);
      }
    },
    [loadData],
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student: any) => {
      const count = student.annotations_count ?? student.negative_annotations_count ?? 0;
      switch (activeFilter) {
        case 'con_registro':
          return count >= 5;
        case 'amonestacion':
          return count >= 5 && count < 10;
        case 'compromiso':
          return count >= 10 && count < 15;
        case 'derivacion':
          return count >= 15;
        default:
          return count >= 5;
      }
    });
  }, [students, activeFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="font-semibold text-neutral-600 text-sm">
            Cargando datos del sistema...
          </p>
          <p className="text-neutral-400 text-xs">
            Conectando con la base de datos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* Hero header - matches CausasView and StudentsPanel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
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
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-5 py-3 font-semibold text-white shadow-md shadow-secondary-500/30 transition-all hover:bg-secondary-600 active:scale-[0.97]"
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
              No se pudo conectar con la base de datos. Los datos mostrados
              corresponden a información local. Los nombres y RUT de los
              estudiantes se encuentran protegidos por normativa de privacidad.
            </p>
            <p className="mt-1 font-mono text-[10px] text-gravisima-600">
              Error: {dbError}
            </p>
          </div>
        </div>
      )}

      {/* Student Table - full width */}
      <AnotacionesStudentTable
        students={filteredStudents}
        privacyMode={privacyMode}
        onSelectStudent={setSelectedStudent}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
      />

      {/* Student Detail Modal */}
      {selectedStudent && (
        <AnotacionesStudentDetailModal
          student={selectedStudent}
          annotations={annotations.filter((a) => a.student_id === selectedStudent.id)}
          privacyMode={privacyMode}
          onClose={() => setSelectedStudent(null)}
          onAddAnnotations={(sid: string, anns: any[]) =>
            handleAddAnnotations(sid || selectedStudent.id, anns)
          }
          onClearAnnotations={() =>
            handleClearAnnotations(selectedStudent.id)
          }
        />
      )}

      {/* New Process Modal */}
      {isNewProcessModalOpen && (
        <NewDisciplinaryProcessModal
          students={students}
          onClose={() => setIsNewProcessModalOpen(false)}
          onRegisterCase={handleRegisterCase}
          currentUserEmail=""
        />
      )}

    </div>
  );
}

