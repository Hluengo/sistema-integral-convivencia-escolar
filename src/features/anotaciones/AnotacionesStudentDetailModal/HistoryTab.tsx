/** @license SPDX-License-Identifier: Apache-2.0 */

import { CheckCircle2, FileSearch, FileText, History, ScrollText, Upload } from 'lucide-react';
import type { CartaDisciplinaria, DocumentAnalysis, EtapaDisciplinaria } from '@/src/shared/lib/types';
import type {
  DetectedAnnotationRecord,
  DisciplinaryFileRecord,
  DisciplinaryProcessRecord,
  LetterOutputEvent,
} from '@/src/services/cartas.service';
import { formatDate } from './constants';

interface TimelineItem {
  id: string;
  date: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: string;
}

interface HistoryTabProps {
  cartas: CartaDisciplinaria[];
  documentAnalyses: DocumentAnalysis[];
  etapas: EtapaDisciplinaria[];
  processes: DisciplinaryProcessRecord[];
  files: DisciplinaryFileRecord[];
  detectedAnnotations: DetectedAnnotationRecord[];
  letterOutputEvents: LetterOutputEvent[];
}

export default function HistoryTab({
  cartas,
  documentAnalyses,
  etapas,
  processes,
  files,
  detectedAnnotations,
  letterOutputEvents,
}: HistoryTabProps) {
  const items: TimelineItem[] = [
    ...files.map((file) => ({
      id: `file-${file.id}`,
      date: file.uploaded_at,
      icon: <Upload className="h-4 w-4" />,
      title: 'PDF subido',
      description: file.original_file_name || file.file_name || file.storage_path,
      tone: 'bg-blue-50 text-blue-700',
    })),
    ...documentAnalyses.map((analysis) => ({
      id: `analysis-${analysis.id}`,
      date: analysis.analyzed_at,
      icon: <FileSearch className="h-4 w-4" />,
      title: 'Análisis realizado',
      description: `${analysis.file_name || 'Documento'} · ${analysis.negativas} negativas, ${analysis.positivas} positivas, ${analysis.informativas} informativas`,
      tone: 'bg-indigo-50 text-indigo-700',
    })),
    ...processes.map((process) => ({
      id: `process-${process.id}`,
      date: process.completed_at || process.created_at,
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: process.is_completed ? 'Actualización confirmada' : 'Proceso creado',
      description: `${process.process_number} · ${process.total_negativas} negativas · sugerencia: ${process.final_letter_type || process.suggested_letter_type || 'sin carta'}`,
      tone: 'bg-emerald-50 text-emerald-700',
    })),
    ...detectedAnnotations.slice(0, 25).map((annotation) => ({
      id: `detected-${annotation.id}`,
      date: annotation.detected_at,
      icon: <History className="h-4 w-4" />,
      title: `Anotación ${annotation.annotation_type} detectada`,
      description: annotation.annotation_text || annotation.raw_text || 'Sin texto registrado',
      tone: 'bg-neutral-50 text-neutral-700',
    })),
    ...letterOutputEvents.map((event) => ({
      id: `letter-output-${event.id}`,
      date: event.created_at,
      icon: <FileText className="h-4 w-4" />,
      title: event.event_name === 'letter_printed' ? 'Carta impresa' : 'Carta descargada',
      description: `${event.properties.letterType || 'Carta'} · Estado al evento: ${event.properties.status || '-'}`,
      tone: 'bg-cyan-50 text-cyan-700',
    })),
    ...cartas.map((carta) => ({
      id: `carta-${carta.id}`,
      date: carta.emission_date || carta.created_at,
      icon: <FileText className="h-4 w-4" />,
      title: `Carta emitida: ${carta.letter_type}`,
      description: `${carta.status} · Apoderado: ${carta.apoderado_name || '-'} · Emitido por: ${carta.emitted_by || '-'}`,
      tone: carta.status === 'Anulada' ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-50 text-amber-700',
    })),
    ...etapas.map((etapa) => ({
      id: `etapa-${etapa.id}`,
      date: etapa.transition_date || etapa.created_at,
      icon: <ScrollText className="h-4 w-4" />,
      title: `Cambio de etapa: ${etapa.stage_name}`,
      description: `${etapa.responsible || 'Sin responsable'}${etapa.comment ? ` · ${etapa.comment}` : ''}`,
      tone: 'bg-purple-50 text-purple-700',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
        <History className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-sm text-neutral-500">No hay eventos disciplinarios registrados para este estudiante.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-neutral-900">{item.title}</h3>
              <span className="text-xs text-neutral-400">{formatDate(item.date)}</span>
            </div>
            <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}