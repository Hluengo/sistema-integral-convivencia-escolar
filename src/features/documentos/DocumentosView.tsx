/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import {
  Search,
  Scale,
  FileText,
  ScrollText,
  ChevronRight,
  BookOpen,
  Sparkles,
  User,
  Circle,
} from 'lucide-react';
import { useUIStore } from '@/src/shared/lib/stores/uiStore';
import { useCausasStore } from '@/src/shared/lib/stores/causasStore';
import { fetchStudentsWithAnnotationCounts, fetchAnnotations } from '@/src/services/annotations.service';
import { fetchCausas } from '@/src/services/cases';
import type { AnotacionStudent, Annotation, Causa } from '@/src/shared/lib/types';
import { getSemaphoricStyle, TEACHERS_BY_COURSE } from '@/src/lib/anotacionesUtils';

const AnotacionesStudentDetailModal = lazy(
  () => import('@/src/features/anotaciones/AnotacionesStudentDetailModal')
);

type DocFiltro = 'todos' | 'causas' | 'anotaciones';

interface HubItem {
  id: string;
  type: 'causa' | 'student';
  date: string;
  studentId: string;
  studentName: string;
  course: string;
  title: string;
  description: string;
  status: string;
  sourceRecord: Causa | AnotacionStudent;
}

const FASE_BADGE: Record<string, string> = {
  Recepción: 'bg-blue-100 text-blue-800',
  Investigación: 'bg-amber-100 text-amber-800',
  Resolución: 'bg-purple-100 text-purple-800',
  Apelación: 'bg-orange-100 text-orange-800',
  Seguimiento: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABEL: Record<string, string> = {
  Verde: 'Sin medida activa',
  Amarillo: 'Amonestación Escrita',
  Naranja: 'Carta de Compromiso Conductual',
  Rojo: 'Derivación a Convivencia Escolar',
};

function getFaseForEstado(estadoActual: string): string {
  if (estadoActual.includes('Recepción') || estadoActual.includes('Denuncia')) return 'Recepción';
  if (
    estadoActual.includes('Indagación') ||
    estadoActual.includes('Investigación') ||
    estadoActual.includes('Mediación')
  ) {
    return 'Investigación';
  }
  if (
    estadoActual.includes('Informe') ||
    estadoActual.includes('Entrevista') ||
    estadoActual.includes('Resolución')
  ) {
    return 'Resolución';
  }
  if (estadoActual.includes('Apelación') || estadoActual.includes('Ejecutoriada')) return 'Apelación';
  if (estadoActual.includes('Seguimiento') || estadoActual.includes('Cerrada')) return 'Seguimiento';
  return 'Investigación';
}

function formatAnnotationSummary(negativeCount: number, positiveCount: number, informativeCount: number): string {
  const totalCount = negativeCount + positiveCount + informativeCount;
  const infoLabel = informativeCount === 1 ? 'informativa' : 'informativas';
  return `${totalCount} anotaciones (${negativeCount} negativas / ${positiveCount} positivas / ${informativeCount} ${infoLabel})`;
}

function formatLastRecordLabel(date?: string): string {
  if (!date) return 'Último Registro: -';
  return `Último Registro: ${new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`;
}

const FILTER_TABS: { key: DocFiltro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'causas', label: 'Causas' },
  { key: 'anotaciones', label: 'Anotaciones' },
];

export default function DocumentosView() {
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const privacyMode = useUIStore((s) => s.privacyMode);
  const setPrivacyMode = useUIStore((s) => s.setPrivacyMode);
  const selectedStudentForDocs = useUIStore((s) => s.selectedStudentForDocs);
  const setSelectedStudentForDocs = useUIStore((s) => s.setSelectedStudentForDocs);
  const setSelectedCausaId = useCausasStore((s) => s.setSelectedCausaId);

  const [hubItems, setHubItems] = useState<HubItem[]>([]);
  const [allAnnotations, setAllAnnotations] = useState<Annotation[]>([]);
  const [students, setStudents] = useState<AnotacionStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AnotacionStudent | null>(null);
  const [filtro, setFiltro] = useState<DocFiltro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCargando(true);
      try {
        const [causas, annotations, estudiantesData] = await Promise.all([
          fetchCausas(0),
          fetchAnnotations(),
          fetchStudentsWithAnnotationCounts(),
        ]);
        if (cancelled) return;

        const studentList = estudiantesData ?? [];
        setStudents(studentList);
        setAllAnnotations(annotations ?? []);

        const causaItems: HubItem[] = (causas ?? []).map((c: Causa) => ({
          id: `causa-${c.id}`,
          type: 'causa',
          date: c.fechaUltimaActualizacion || c.fechaApertura,
          studentId: '',
          studentName: c.estudianteNombre,
          course: c.estudianteCurso,
          title: `Causa ${c.id}`,
          description: c.observaciones || '',
          status: c.estadoActual,
          sourceRecord: c,
        }));

        const studentItems: HubItem[] = studentList.reduce<HubItem[]>((acc, s) => {
          const negCount = Number(s.annotations_count) || 0;
          const posCount = Number(s.positive_annotations_count || 0);
          const infoCount = Number(s.informative_annotations_count || 0);
          if (negCount + posCount + infoCount > 0) {
            acc.push({
              id: `student-${s.id}`,
              type: 'student',
              date: s.last_annotation_date || '',
              studentId: s.id,
              studentName: s.full_name,
              course: s.course_name || s.course_id || '',
              title: s.full_name,
              description: formatAnnotationSummary(negCount, posCount, infoCount),
              status: s.disciplinary_status,
              sourceRecord: s,
            });
          }
          return acc;
        }, []);

        setHubItems(
          [...causaItems, ...studentItems].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      } catch {
        if (!cancelled) {
          setHubItems([]);
          setAllAnnotations([]);
        }
      } finally {
        if (!cancelled) setCargando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const docsFiltrados = useMemo(() => {
    let result = hubItems;
    if (filtro !== 'todos') {
      const sourceMap: Record<string, HubItem['type']> = {
        causas: 'causa',
        anotaciones: 'student',
      };
      result = result.filter((d) => d.type === sourceMap[filtro]);
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.studentName.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.course && item.course.toLowerCase().includes(q)) ||
          item.description.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q) ||
          (item.type === 'causa' && (item.sourceRecord as Causa).id.toLowerCase().includes(q))
      );
    }
    return result;
  }, [hubItems, filtro, busqueda]);

  const filterCounts = useMemo(
    () => ({
      todos: hubItems.length,
      causas: hubItems.filter((d) => d.type === 'causa').length,
      anotaciones: hubItems.filter((d) => d.type === 'student').length,
    }),
    [hubItems]
  );

  const selectedStudentAnnotations = useMemo(() => {
    if (!selectedStudent) return [];
    return allAnnotations.filter((a) => a.student_id === selectedStudent.id);
  }, [allAnnotations, selectedStudent]);

  const handleDocClick = (item: HubItem) => {
    if (item.type === 'causa') {
      const causa = item.sourceRecord as Causa;
      setSelectedCausaId(causa.id);
      setCurrentView('causas');
      return;
    }

    if (item.studentId) {
      const match = students.find((s) => s.id === item.studentId);
      if (match) {
        setSelectedStudent(match);
        setBusqueda('');
      }
    }
  };

  const handleClearAnnotations = (studentId: string) => {
    setAllAnnotations((prev) => prev.filter((a) => a.student_id !== studentId));
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              annotations_count: 0,
              positive_annotations_count: 0,
              informative_annotations_count: 0,
              disciplinary_status: 'Verde',
            }
          : student
      )
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
            Convivencia Escolar · Registros
          </p>
          <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Registros</h2>
          <p className="mt-2 text-blue-100/80 text-sm">
            Hub de navegación de causas y anotaciones registradas en el sistema
          </p>
        </div>
      </div>

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
                  isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    isActive ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-200/60 text-neutral-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="flex animate-pulse items-center gap-4 rounded-xl border border-neutral-200/60 bg-white p-5">
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
        <div className="rounded-xl border border-neutral-200/80 bg-white p-12 text-center shadow-xs">
          <ScrollText className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
          <h3 className="font-semibold text-neutral-700 text-sm">No se encontraron documentos</h3>
          <p className="mt-1 text-neutral-400 text-xs">
            {busqueda ? 'No hay documentos que coincidan con la búsqueda.' : 'No hay documentos registrados en el sistema.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docsFiltrados.map((item) => {
            const isCausa = item.type === 'causa';
            const isStudent = item.type === 'student';
            const fase = isCausa ? getFaseForEstado(item.status) : '';
            const studentRecord = isStudent ? (item.sourceRecord as AnotacionStudent) : null;
            const negCount = studentRecord ? Number(studentRecord.annotations_count) || 0 : 0;
            const semStyle = studentRecord ? getSemaphoricStyle(negCount) : { badge: '', dot: '', text: '' };
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleDocClick(item)}
                className="flex w-full items-center gap-4 rounded-xl border border-neutral-200/80 bg-white p-5 text-left shadow-xs transition-colors transition-shadow hover:border-brand-200 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isCausa ? 'bg-brand-50' : 'bg-violet-50'}`}>
                  {isCausa ? <Scale className="h-5 w-5 text-brand-600" /> : <User className="h-5 w-5 text-violet-600" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-bold text-neutral-900 text-sm truncate">{item.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-[10px] ${isCausa ? 'bg-brand-100 text-brand-700' : 'bg-violet-100 text-violet-700'}`}>
                      {isCausa ? 'Causa' : 'Anotaciones'}
                    </span>
                    {isStudent && semStyle.dot && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[10px] ${semStyle.badge}`}>
                        <Circle className={`h-1.5 w-1.5 fill-current${semStyle.dot}`} />
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-500 text-xs">
                    {item.course && <span className="text-neutral-400">{item.course}</span>}
                    <span className="text-neutral-400">{formatLastRecordLabel(item.date)}</span>
                  </div>
                  {item.description && <p className="mt-1 text-neutral-500 text-xs">{item.description}</p>}
                  {isCausa && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {fase && FASE_BADGE[fase] && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${FASE_BADGE[fase]}`}>
                          {fase}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-semibold text-[10px] text-brand-700">
                        <Sparkles className="h-2.5 w-2.5" />
                        IA Disponible
                      </span>
                    </div>
                  )}
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
                        Abrir Ficha
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

      {selectedStudent && (
        <Suspense fallback={<div className="py-10 text-center text-sm text-neutral-500">Cargando ficha disciplinaria...</div>}>
          <AnotacionesStudentDetailModal
            student={selectedStudent}
            annotations={selectedStudentAnnotations}
            privacyMode={privacyMode}
            onClose={() => setSelectedStudent(null)}
            onClearAnnotations={() => handleClearAnnotations(selectedStudent.id)}
            teachers={TEACHERS_BY_COURSE}
            onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
          />
        </Suspense>
      )}
    </div>
  );
}
