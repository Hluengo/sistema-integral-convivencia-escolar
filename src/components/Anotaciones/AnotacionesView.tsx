/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Plus } from 'lucide-react';
import { Annotation } from '../../types';
import { supabase, fetchAnnotations, fetchStudentsWithAnnotationCounts, saveAnnotation } from '../../lib/supabase';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import AnotacionesStudentDetailModal from './AnotacionesStudentDetailModal';
import NewDisciplinaryProcessModal from './NewDisciplinaryProcessModal';

const TEACHERS_BY_COURSE: Record<string, string> = {
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

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedStudent) { setAnnotations([]); return; }
    let cancelled = false;
    (async () => {
      const anns = await fetchAnnotations(selectedStudent.id);
      if (!cancelled) setAnnotations((anns ?? []) as unknown as Annotation[]);
    })();
    return () => { cancelled = true; };
  }, [selectedStudent?.id]);

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
          if (fresh) setSelectedStudent(fresh);
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
        if (error) throw error;
        await loadData();
        if (selectedStudent && selectedStudent.id === studentId) {
          const fresh = students.find((s: any) => s.id === studentId);
          if (fresh) setSelectedStudent(fresh);
        }
      } catch (error: any) {
        console.error('Error limpiando anotaciones:', error);
        setDbError(error?.message ?? 'Error al limpiar anotaciones');
      }
    },
    [loadData, selectedStudent, students],
  );

  const handleRegisterCase = useCallback(
    async (studentId: string, newAnnotations: any[], fileData?: any) => {
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-neutral-600">
            Cargando datos del sistema...
          </p>
          <p className="text-xs text-neutral-400">
            Conectando con la base de datos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col antialiased text-neutral-800">

      {/* DB Error Alert */}
      {dbError && (
        <div className="bg-red-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
          <Shield className="w-5 h-5 text-gravisima-500 shrink-0 mt-0.5" />
          <div className="text-xs text-gravisima-800 space-y-1">
            <p className="font-bold">Protección de Datos de NNA</p>
            <p className="leading-relaxed">
              No se pudo conectar con la base de datos. Los datos mostrados
              corresponden a información local. Los nombres y RUT de los
              estudiantes se encuentran protegidos por normativa de privacidad.
            </p>
            <p className="text-[10px] text-gravisima-600 font-mono mt-1">
              Error: {dbError}
            </p>
          </div>
        </div>
      )}

      {/* New Process Button */}
      <div className="flex justify-end mb-6">
        <button type="button"
          onClick={() => setIsNewProcessModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proceso
        </button>
      </div>

      {/* Student Table - full width */}
      <AnotacionesStudentTable
        students={filteredStudents}
        privacyMode={privacyMode}
        onSelectStudent={setSelectedStudent}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={handleRefresh}
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

