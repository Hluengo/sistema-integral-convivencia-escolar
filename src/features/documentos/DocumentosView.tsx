/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Search, Scale, FileText, ScrollText, Plus, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { useUIStore } from '@/src/shared/lib/stores/uiStore';
import { useCausasStore } from '@/src/shared/lib/stores/causasStore';
import { fetchStudentsWithAnnotationCounts } from '@/src/services/annotations.service';
import { fetchCartas } from '@/src/services/cartas.service';
import { fetchCausas } from '@/src/services/cases';
import type { AnotacionStudent, CartaDisciplinaria, Causa } from '@/src/shared/lib/types';
import { getSemaphoricStyle } from '@/src/lib/anotacionesUtils';

const AnotacionesDocumentGenerator = lazy(() => import('@/src/features/anotaciones/AnotacionesDocumentGenerator'));

type DocSource = 'causa' | 'anotacion';
type DocFiltro = 'todos' | 'causas' | 'anotaciones';

interface UnifiedDoc {
  id: string;
  source: DocSource;
  titulo: string;
  estudiante: string;
  estudianteId: string;
  curso: string;
  fecha: string;
  estado: string;
  causaId?: string;
  tieneIA: boolean;
}

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
  Pendiente: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Cumplida: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Incumplida: { bg: 'bg-red-100', text: 'text-red-800' },
  Anulada: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
};

const LETTER_TYPE_LABEL: Record<string, string> = {
  'Amonestación Escrita': 'Carta de Amonestación',
  'Carta de Compromiso Conductual': 'Carta de Compromiso Conductual',
};

const FASE_BADGE: Record<string, string> = {
  Recepción: 'bg-blue-100 text-blue-800',
  Investigación: 'bg-amber-100 text-amber-800',
  Resolución: 'bg-purple-100 text-purple-800',
  Apelación: 'bg-orange-100 text-orange-800',
  Seguimiento: 'bg-emerald-100 text-emerald-800',
};

function getFaseForEstado(estadoActual: string): string {
  if (estadoActual.includes('Recepción') || estadoActual.includes('Denuncia')) return 'Recepción';
  if (estadoActual.includes('Indagación') || estadoActual.includes('Investigación') || estadoActual.includes('Mediación')) return 'Investigación';
  if (estadoActual.includes('Informe') || estadoActual.includes('Entrevista') || estadoActual.includes('Resolución')) return 'Resolución';
  if (estadoActual.includes('Apelación') || estadoActual.includes('Ejecutoriada')) return 'Apelación';
  if (estadoActual.includes('Seguimiento') || estadoActual.includes('Cerrada')) return 'Seguimiento';
  return 'Investigación';
}

const FILTER_TABS: { key: DocFiltro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'causas', label: 'Causas' },
  { key: 'anotaciones', label: 'Anotaciones' },
];

export default function DocumentosView() {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setSelectedCausaId = useCausasStore((s) => s.setSelectedCausaId);
  const selectedStudentForDocs = useUIStore((s) => s.selectedStudentForDocs);
  const setSelectedStudentForDocs = useUIStore((s) => s.setSelectedStudentForDocs);

  // Unified document state
  const [docs, setDocs] = useState<UnifiedDoc[]>([]);
  const [filtro, setFiltro] = useState<DocFiltro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Student state for anotacion detail view
  const [students, setStudents] = useState<AnotacionStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AnotacionStudent | null>(null);
  const [cartas, setCartas] = useState<CartaDisciplinaria[]>([]);
  const [isLoadingCartas, setIsLoadingCartas] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [initialDocType, setInitialDocType] = useState<string | undefined>(undefined);

  // Load unified documents on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCargando(true);
      try {
        const [causas, estudiantesData] = await Promise.all([
          fetchCausas(0),
          fetchStudentsWithAnnotationCounts(),
        ]);
        if (cancelled) return;
        const allStudents = estudiantesData ?? [];
        setStudents(allStudents);

        const estudiantesConAnotaciones = allStudents.filter(
          (s) => (s.annotations_count || 0) > 0
        );

        const cartasPorEstudiante = estudiantesConAnotaciones.length > 0
          ? await Promise.all(estudiantesConAnotaciones.map((s) => fetchCartas(s.id)))
          : [];
        if (cancelled) return;

        const causaDocs: UnifiedDoc[] = causas.map((c: Causa) => ({
          id: `causa-${c.id}`,
          source: 'causa' as const,
          titulo: `Expediente ${c.id}`,
          estudiante: c.estudianteNombre,
          estudianteId: '',
          curso: c.estudianteCurso,
          fecha: c.fechaUltimaActualizacion || c.fechaApertura,
          estado: c.estadoActual,
          causaId: c.id,
          tieneIA: true,
        }));

        const anotacionDocs: UnifiedDoc[] = [];
        for (let i = 0; i < estudiantesConAnotaciones.length; i++) {
          const student = estudiantesConAnotaciones[i];
          const studentCartas = cartasPorEstudiante[i] || [];
          for (const carta of studentCartas) {
            anotacionDocs.push({
              id: `anotacion-${carta.id}`,
              source: 'anotacion' as const,
              titulo: LETTER_TYPE_LABEL[carta.letter_type] || carta.letter_type,
              estudiante: student.full_name,
              estudianteId: student.id,
              curso: student.course_name || '',
              fecha: carta.emission_date,
              estado: carta.status,
              tieneIA: false,
            });
          }
        }

        setDocs(
          [...causaDocs, ...anotacionDocs].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          )
        );
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setCargando(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cross-navigation from Anotaciones → Documentos
  useEffect(() => {
    if (selectedStudentForDocs && students.length > 0 && !selectedStudent) {
      const match = students.find((s) => s.id === selectedStudentForDocs);
      if (match) {
        setSelectedStudent(match);
        setSelectedStudentForDocs(null);
      }
    }
  }, [selectedStudentForDocs, students, selectedStudent, setSelectedStudentForDocs]);

  // Fetch cartas when student is selected
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

  // Filtered documents
  const docsFiltrados = useMemo(() => {
    let result = docs;
    if (filtro !== 'todos') {
      const sourceMap: Record<string, DocSource> = { causas: 'causa', anotaciones: 'anotacion' };
      result = result.filter((d) => d.source === sourceMap[filtro]);
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.estudiante.toLowerCase().includes(q) ||
          d.titulo.toLowerCase().includes(q) ||
          (d.curso && d.curso.toLowerCase().includes(q))
      );
    }
    return result;
  }, [docs, filtro, busqueda]);

  const filterCounts = useMemo(
    () => ({
      todos: docs.length,
      causas: docs.filter((d) => d.source === 'causa').length,
      anotaciones: docs.filter((d) => d.source === 'anotacion').length,
    }),
    [docs]
  );

  const handleDocClick = (doc: UnifiedDoc) => {
    if (doc.source === 'causa' && doc.causaId) {
      setSelectedCausaId(doc.causaId);
      setCurrentView('causas');
    } else if (doc.source === 'anotacion' && doc.estudianteId) {
      const match = students.find((s) => s.id === doc.estudianteId);
      if (match) {
        setSelectedStudent(match);
        setBusqueda('');
        setShowGenerator(false);
        setInitialDocType(undefined);
      }
    }
  };

  // Student detail handlers (existing logic)
  const negativeCount = selectedStudent ? (Number(selectedStudent.annotations_count) || 0) : 0;
  const semaphoric = selectedStudent ? getSemaphoricStyle(negativeCount) : { badge: '', dot: '', text: '' };
  const cta = selectedStudent ? getCtaForCount(negativeCount) : null;

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
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative">
          <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
            Convivencia Escolar · Documentos
          </p>
          <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Documentos</h2>
          <p className="mt-2 text-blue-100/80 text-sm">
            Hub de navegación de causas y anotaciones registradas en el sistema
          </p>
        </div>
      </div>

      {!selectedStudent ? (
        <>
          {/* Filters + Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por estudiante o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-4 pl-10 font-medium text-neutral-800 text-sm outline-none transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                aria-label="Buscar por estudiante o documento"
              />
            </div>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
              {FILTER_TABS.map((tab) => {
                const isActive = filtro === tab.key;
                const count = filterCounts[tab.key] ?? 0;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFiltro(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                        isActive
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-neutral-200/60 text-neutral-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document list */}
          {cargando ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-${i}`} className="flex animate-pulse items-center gap-4 rounded-2xl border border-neutral-200/60 bg-white p-5">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-neutral-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-neutral-200" />
                    <div className="h-3 w-64 rounded bg-neutral-100" />
                  </div>
                  <div className="h-8 w-24 rounded-lg bg-neutral-100" />
                </div>
              ))}
            </div>
          ) : docsFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-12 text-center shadow-xs">
              <ScrollText className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
              <h3 className="font-semibold text-neutral-700 text-sm">No se encontraron documentos</h3>
              <p className="mt-1 text-neutral-400 text-xs">
                {busqueda
                  ? 'No hay documentos que coincidan con la búsqueda.'
                  : 'No hay documentos registrados en el sistema.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {docsFiltrados.map((doc) => {
                const isCausa = doc.source === 'causa';
                const fase = isCausa ? getFaseForEstado(doc.estado) : '';
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDocClick(doc)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 text-left shadow-xs transition-colors transition-shadow hover:border-brand-200 hover:shadow-md"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isCausa ? 'bg-brand-50' : 'bg-indigo-50'}`}>
                      {isCausa ? (
                        <Scale className="h-5 w-5 text-brand-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-bold text-neutral-900 text-sm truncate">{doc.titulo}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-[10px] ${isCausa ? 'bg-brand-100 text-brand-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {isCausa ? 'Causa' : 'Anotación'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-500 text-xs">
                        <span className="font-medium text-neutral-700">{doc.estudiante}</span>
                        {doc.curso && <span className="text-neutral-400">{doc.curso}</span>}
                        <span className="text-neutral-400">
                          {doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {isCausa ? (
                          <>
                            {fase && FASE_BADGE[fase] && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${FASE_BADGE[fase]}`}>
                                {fase}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-semibold text-[10px] text-brand-700">
                              <Sparkles className="h-2.5 w-2.5" />
                              IA Disponible
                            </span>
                          </>
                        ) : doc.estado ? (
                          (() => {
                            const badge = STATUS_BADGE[doc.estado] || STATUS_BADGE.Vigente;
                            return (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${badge.bg} ${badge.text}`}>
                                {doc.estado}
                              </span>
                            );
                          })()
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-1 font-semibold text-neutral-600 text-[10px]">
                        {isCausa ? (
                          <>
                            <BookOpen className="h-3 w-3" />
                            Abrir Causa
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3" />
                            Ver Carta
                          </>
                        )}
                      </span>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Student carta detail view (existing flow) */
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <span className="font-bold text-brand-600 text-sm">{selectedStudent.full_name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">{selectedStudent.full_name}</h3>
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
