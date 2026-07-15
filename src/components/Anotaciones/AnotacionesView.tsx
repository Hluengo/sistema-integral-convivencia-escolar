/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BookOpen, Shield, RefreshCw, Plus, Search, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Annotation, DisciplinaryStatus } from '../../types';
import { supabase, fetchAnnotations, fetchStudentsWithAnnotationCounts, saveAnnotation } from '../../lib/supabase';
import { maskName, maskRut, getSemaphoricStyle } from '../../lib/anotacionesUtils';
import AnotacionesDashboardStats from './AnotacionesDashboardStats';
import AnotacionesStudentTable from './AnotacionesStudentTable';
import AnotacionesStudentDetailModal from './AnotacionesStudentDetailModal';

export const TEACHERS_BY_COURSE: Record<string, string> = {
  '1° Básico A': 'Constanza Espinoza Miranda',
  '1° Básico B': 'Natalia Albornoz Rodríguez',
  '2° Básico A': 'Camila Godoy Venegas',
  '2° Básico B': 'Belén Fuentes Salazar',
  '3° Básico A': 'Esperanza Moraga Saint Jour',
  '3° Básico B': 'María Olivia Garcés',
  '4° Básico A': 'Javiera Jofré San Martín',
  '4° Básico B': 'Carolina Ruíz Risopatrón',
  '5° Básico A': 'Pamela Jara González',
  '5° Básico B': 'Viviana Saavedra Barrera',
  '6° Básico A': 'Silvana Pincheira Rodríguez',
  '6° Básico B': 'Rosario Salinas Campos',
  '7° Básico A': 'Marcelo Muñoz Pino',
  '7° Básico B': 'María Isabel Matus Retamal',
  '8° Básico A': 'Vannia Retamal Salgado',
  '8° Básico B': 'Patricio Zambrano Asencio',
  '1° Medio A': 'Ester Contreras Espinoza',
  '1° Medio B': 'Maritza Carrasco Palma',
  '2° Medio A': 'Percy Rocha Luna',
  '2° Medio B': 'Jeremy Pérez Muñoz',
  '3° Medio A': 'Angelo Freire Contreras',
  '3° Medio B': 'Carolina Agüero Cárdenas',
  '4° Medio A': 'Vicente Burgos Estrada',
  '4° Medio B': 'Keyla Rodríguez Sanhueza',
};

export default function AnotacionesView() {
  const [students, setStudents] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbError, setDbError] = useState<string | null>(null);

  // ─── Dashboard Stats ──────────────────────────────────────
  const totalStudents = students.length;
  const amonestacionCount = students.filter((s: any) => {
    const c = s.annotations_count ?? s.negative_annotations_count ?? 0;
    return c >= 5 && c < 10;
  }).length;
  const compromisoCount = students.filter((s: any) => {
    const c = s.annotations_count ?? s.negative_annotations_count ?? 0;
    return c >= 10 && c < 15;
  }).length;
  const derivacionCount = students.filter((s: any) => {
    const c = s.annotations_count ?? s.negative_annotations_count ?? 0;
    return c >= 15;
  }).length;

  // ─── Data Loading ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const [fetchedStudents, fetchedAnnotations] = await Promise.all([
        fetchStudentsWithAnnotationCounts(),
        fetchAnnotations(),
      ]);
      setStudents(fetchedStudents ?? []);
      setAnnotations((fetchedAnnotations ?? []) as unknown as Annotation[]);
    } catch (error: any) {
      console.error('Error cargando datos desde Supabase:', error);
      setDbError(error?.message ?? 'Error de conexión con la base de datos');
      setStudents([]);
      setAnnotations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleAddAnnotations = useCallback(
    async (studentId: string, newAnnotations: Annotation[]) => {
      try {
        for (const ann of newAnnotations) {
          await saveAnnotation({
            student_id: studentId,
            observation: ann.text || "",
            severity: ann.severity || "Leve",
            type: ann.type || "Negativa",
            registered_by: ann.registered_by || "Inspector\u00EDa",
          });
        }
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

  // ─── Filtered Students ────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter((student: any) => {
      const count = student.annotations_count ?? student.negative_annotations_count ?? 0;
      switch (activeFilter) {
        case 'todas':
          return true;
        case 'amonestacion':
          return count >= 5 && count < 10;
        case 'compromiso':
          return count >= 10 && count < 15;
        case 'derivacion':
          return count >= 15;
        case 'sin_registro':
          return count === 0;
        default:
          return true;
      }
    });
  }, [students, activeFilter]);

  // ─── Loading State ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">
            Cargando datos del sistema...
          </p>
          <p className="text-xs text-slate-400">
            Conectando con la base de datos
          </p>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased text-slate-800">

      {/* ═══ Top Header ═══ */}
      <header className="bg-white text-slate-900 border-b border-slate-200 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">
                Sistema de Convivencia Escolar
              </span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                GESTOR INTELIGENTE DE HOJAS DE VIDA
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Colegio Carmela Romero de Espinosa • Administrador de Hojas de Vida
              </p>
            </div>
          </div>

          {/* Top actions */}
          <div className="flex items-center gap-3 self-start md:self-center">
            {/* Privacy toggle */}
            <button
              onClick={() => setPrivacyMode((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                privacyMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              {privacyMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Privacidad NNA Activa
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Ver Datos Reales
                </>
              )}
            </button>

            {/* New process button */}
            <button
              onClick={() => setIsNewProcessModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proceso
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Main content ═══ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {/* DB Error Alert */}
        {dbError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
            <Shield className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 space-y-1">
              <p className="font-bold">Protección de Datos de NNA</p>
              <p className="leading-relaxed">
                No se pudo conectar con la base de datos. Los datos mostrados
                corresponden a información local. Los nombres y RUT de los
                estudiantes se encuentran protegidos por normativa de privacidad.
              </p>
              <p className="text-[10px] text-rose-600 font-mono mt-1">
                Error: {dbError}
              </p>
            </div>
          </div>
        )}

        {/* ═══ Dashboard Stats ═══ */}
        <div className="mb-6">
          <AnotacionesDashboardStats
            totalStudents={totalStudents}
            amonestacionCount={amonestacionCount}
            compromisoCount={compromisoCount}
            derivacionCount={derivacionCount}
          />
        </div>

        {/* ═══ Student Table ═══ */}
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

      </main>

      {/* ═══ Footer ═══ */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] sm:text-xs text-slate-400 mt-auto shrink-0 shadow-xs">
        <p className="font-semibold text-slate-500">
          © 2026 Colegio Carmela Romero de Espinosa. Todos los derechos reservados.
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Gestor Inteligente de Hojas de Vida • Sistema de Convivencia Escolar
        </p>
      </footer>

      {/* ═══ Student Detail Modal ═══ */}
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
          onTogglePrivacy={() => setPrivacyMode((prev) => !prev)}
        />
      )}

    </div>
  );
}


