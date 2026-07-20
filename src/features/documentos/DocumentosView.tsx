/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Search, FileText, ScrollText, Plus } from 'lucide-react';
import { useUIStore } from '@/src/shared/lib/stores/uiStore';
import { fetchStudentsWithAnnotationCounts } from '@/src/services/annotations.service';
import { fetchCartas } from '@/src/services/cartas.service';
import type { AnotacionStudent, CartaDisciplinaria } from '@/src/shared/lib/types';
import { getSemaphoricStyle } from '@/src/lib/anotacionesUtils';

const AnotacionesDocumentGenerator = lazy(() => import('@/src/features/anotaciones/AnotacionesDocumentGenerator'));

const CTA_THRESHOLDS = [
  { min: 5, max: 9, docType: 'amonestacion' as const, label: 'Crear Carta de Amonestación' },
  { min: 10, max: 14, docType: 'compromiso_conductual' as const, label: 'Crear Carta de Compromiso Conductual' },
  { min: 15, max: Infinity, docType: 'derivacion' as const, label: 'Crear Ficha de Derivación' },
] as const;

function getCtaForCount(count: number): (typeof CTA_THRESHOLDS)[number] | null {
  for (const t of CTA_THRESHOLDS) {
    if (count >= t.min && count <= t.max) return t;
  }
  return null;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  Vigente: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Cumplida: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Incumplida: { bg: 'bg-red-100', text: 'text-red-800' },
  Anulada: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
};

const LETTER_TYPE_LABEL: Record<string, string> = {
  'Amonestación Escrita': 'Carta de Amonestación',
  'Carta de Compromiso Conductual': 'Carta de Compromiso Conductual',
};

export default function DocumentosView() {
  const selectedStudentForDocs = useUIStore((s) => s.selectedStudentForDocs);
  const setSelectedStudentForDocs = useUIStore((s) => s.setSelectedStudentForDocs);

  const [students, setStudents] = useState<AnotacionStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<AnotacionStudent | null>(null);
  const [cartas, setCartas] = useState<CartaDisciplinaria[]>([]);
  const [isLoadingCartas, setIsLoadingCartas] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [initialDocType, setInitialDocType] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setIsLoadingStudents(true);
      try {
        const data = await fetchStudentsWithAnnotationCounts();
        setStudents(data ?? []);
      } catch {
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedStudentForDocs && students.length > 0 && !selectedStudent) {
      const match = students.find((s) => s.id === selectedStudentForDocs);
      if (match) {
        setSelectedStudent(match);
        setSelectedStudentForDocs(null);
      }
    }
  }, [selectedStudentForDocs, students, selectedStudent, setSelectedStudentForDocs]);

  useEffect(() => {
    if (!selectedStudent) {
      setCartas([]);
      return;
    }
    (async () => {
      setIsLoadingCartas(true);
      try {
        const data = await fetchCartas(selectedStudent.id);
        setCartas(data ?? []);
      } catch {
        setCartas([]);
      } finally {
        setIsLoadingCartas(false);
      }
    })();
  }, [selectedStudent?.id, selectedStudent]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.rut && s.rut.includes(q))
    );
  }, [students, searchQuery]);

  const negativeCount = selectedStudent ? (Number(selectedStudent.annotations_count) || 0) : 0;
  const semaphoric = selectedStudent ? getSemaphoricStyle(negativeCount) : { badge: '', dot: '', text: '' };
  const cta = selectedStudent ? getCtaForCount(negativeCount) : null;

  const handleSelectStudent = (s: AnotacionStudent) => {
    setSelectedStudent(s);
    setSearchQuery('');
    setShowGenerator(false);
    setInitialDocType(undefined);
  };

  const handleCtaClick = () => {
    if (cta) {
      setInitialDocType(cta.docType);
      setShowGenerator(true);
    }
  };

  const handleNewDocument = () => {
    setInitialDocType(undefined);
    setShowGenerator(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative">
          <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
            Convivencia Escolar · Documentos
          </p>
          <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Documentos Oficiales</h2>
          <p className="mt-2 text-blue-100/80 text-sm">
            Gestión de cartas de amonestación, compromiso conductual y derivación
          </p>
        </div>
      </div>

      {!selectedStudent ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
          <div className="border-b border-neutral-100 px-5 py-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar estudiante por nombre o RUT..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pr-4 pl-9 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-sm">
                {searchQuery ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-brand-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700 text-sm">
                      {s.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-800 text-sm truncate">{s.full_name}</p>
                      <p className="text-neutral-500 text-xs">{s.course_name || s.course_id}</p>
                    </div>
                    <span className="font-semibold text-neutral-400 text-xs tabular-nums">
                      {Number(s.annotations_count) || 0} neg.
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <span className="font-bold text-brand-600 text-sm">{selectedStudent.full_name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">
                    {selectedStudent.full_name}
                  </h3>
                  <p className="text-neutral-500 text-xs">
                    {selectedStudent.course_name || selectedStudent.course_id}
                    {selectedStudent.rut && ` · ${selectedStudent.rut}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedStudent(null); setShowGenerator(false); }}
                className="rounded-lg px-3 py-1.5 text-neutral-500 text-xs transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                Cambiar estudiante
              </button>
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full${semaphoric.dot}`} />
                <span className={`font-semibold text-xs${semaphoric.text}`}>{negativeCount} anotaciones negativas</span>
              </div>
              {cta && cartas.length === 0 && !showGenerator && (
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-medium text-xs text-white shadow-xs transition-colors hover:bg-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {cta.label}
                </button>
              )}
              {cartas.length > 0 && !showGenerator && (
                <button
                  type="button"
                  onClick={handleNewDocument}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 px-4 py-2 font-medium text-brand-700 text-xs transition-colors hover:bg-brand-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo Documento
                </button>
              )}
            </div>
          </div>

          {!showGenerator && (
            <>
              {isLoadingCartas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              ) : cartas.length > 0 ? (
                <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
                  <div className="border-b border-neutral-100 px-5 py-4">
                    <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
                      <ScrollText className="h-4 w-4 text-brand-600" />
                      Cartas Emitidas ({cartas.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {cartas.map((carta) => {
                      const badge = STATUS_BADGE[carta.status] || STATUS_BADGE.Vigente;
                      return (
                        <div key={carta.id} className="flex items-center justify-between px-5 py-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-neutral-800 text-sm">
                              {LETTER_TYPE_LABEL[carta.letter_type] || carta.letter_type}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-neutral-500 text-xs">
                              <span>{carta.emission_date ? new Date(carta.emission_date).toLocaleDateString('es-CL') : '-'}</span>
                              <span>Apoderado: {carta.apoderado_name || '-'}</span>
                              <span>Emitido por: {carta.emitted_by || '-'}</span>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 font-semibold text-[10px] ${badge.bg} ${badge.text}`}>
                            {carta.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 text-center shadow-xs">
                  <ScrollText className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
                  <p className="font-medium text-neutral-700 text-sm">No hay documentos emitidos</p>
                  <p className="mt-1 text-neutral-400 text-xs">
                    Aún no se han generado cartas de amonestación, compromiso conductual o derivaciones para este estudiante.
                  </p>
                  <button
                    type="button"
                    onClick={handleNewDocument}
                    className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    Crear Primer Documento
                  </button>
                </div>
              )}
            </>
          )}

          {showGenerator && (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Generar Documento
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowGenerator(false); setInitialDocType(undefined); }}
                  className="rounded-lg px-3 py-1.5 text-neutral-500 text-xs transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                >
                  Cerrar
                </button>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>}>
                <AnotacionesDocumentGenerator
                  student={{
                    id: selectedStudent.id,
                    full_name: selectedStudent.full_name,
                    course_id: selectedStudent.course_id,
                    rut: selectedStudent.rut,
                    teacher_id: selectedStudent.teacher_id,
                  }}
                  annotations={[]}
                  privacyMode={false}
                  teachers={{}}
                  initialDocType={initialDocType}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
