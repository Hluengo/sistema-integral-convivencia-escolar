/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, AlertTriangle, History, CheckCircle2, FileText, ScrollText, Trash2, Lightbulb } from 'lucide-react';
import type { Annotation } from '../../../types';
import { getSemaphoricStyle } from '../../../lib/anotacionesUtils';
import { formatDate, STATUS_STYLE, DISCIPLINARY_SUGGESTION, type StudentInfo, type DisciplinayRecord } from './constants';

interface StudentSummaryTabProps {
  student: StudentInfo;
  annotations: Annotation[];
  currentMeasure: string;
  transitions: DisciplinayRecord[];
  etapas: DisciplinayRecord[];
  activeCase: DisciplinayRecord | null;
  dateStr: string;
  pendingParsedCount?: number;
  onGoToRevisionTab?: () => void;
  onGoToDocumentos?: () => void;
  onClearAnnotations?: () => void;
}

export default function StudentSummaryTab({
  student,
  annotations,
  currentMeasure,
  transitions,
  etapas,
  activeCase,
  dateStr,
  pendingParsedCount = 0,
  onGoToRevisionTab,
  onGoToDocumentos,
  onClearAnnotations,
}: StudentSummaryTabProps) {
  const negativeCount = annotations.filter((a) => a.type === 'Negativa').length;
  const positiveCount = Number(student.positive_annotations_count) || annotations.filter((a) => a.type === 'Positiva').length || 0;
  const semaphoric = getSemaphoricStyle(negativeCount);
  const statusKey = student.disciplinary_status || 'Verde';
  const statusInfo = STATUS_STYLE[statusKey] || STATUS_STYLE.Verde;
  const suggestion = DISCIPLINARY_SUGGESTION[statusKey] || DISCIPLINARY_SUGGESTION.Verde;

  return (
    <div className="stagger-children space-y-5">
      {pendingParsedCount > 0 && (
        <div className="animate-slide-up rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-xs" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              <p className="font-medium text-brand-800 text-sm">
                {pendingParsedCount} anotación{pendingParsedCount !== 1 ? 'es' : ''} pendiente{pendingParsedCount !== 1 ? 's' : ''} de registrar desde PDF
              </p>
            </div>
            {onGoToRevisionTab && (
              <button
                type="button"
                onClick={onGoToRevisionTab}
                className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-xs text-white transition-colors hover:bg-brand-700"
              >
                Ir a Revisión
              </button>
            )}
          </div>
        </div>
      )}

      <div className="animate-slide-up rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-md" style={{ animationDelay: '0ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-600" />
            <h3 className="font-bold text-neutral-900 text-sm">Medida Disciplinaria Actual</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold${semaphoric.badge}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full${semaphoric.dot}`} />
              {statusInfo.label}
            </span>
            <span className="text-neutral-400">|</span>
            <span className={`font-bold${semaphoric.text}`}>{negativeCount}</span>
            <span className="text-neutral-400">negativas</span>
            <span className="text-neutral-300">·</span>
            <span className="font-bold text-emerald-600">{positiveCount}</span>
            <span className="text-neutral-400">positivas</span>
            {onClearAnnotations && negativeCount > 0 && (
              <>
                <span className="text-neutral-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Eliminar todas las anotaciones de este estudiante? Esta acción no se puede deshacer.')) {
                      onClearAnnotations();
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-rose-600 text-xs transition-colors hover:bg-rose-50"
                  title="Eliminar todas las anotaciones"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpiar
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 border-t border-neutral-100 pt-3">
          {currentMeasure ? (
            <div className="flex items-center justify-between">
              <p className="font-medium text-neutral-700 text-sm">{currentMeasure}</p>
              <p className="text-neutral-400 text-xs">{dateStr}</p>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm italic">
              No hay una medida disciplinaria activa registrada.
            </p>
          )}
        </div>
      </div>

      {negativeCount > 0 && (
        <div className={`animate-slide-up rounded-2xl border p-4 shadow-xs transition-shadow hover:shadow-md ${suggestion.accent}`} style={{ animationDelay: '30ms' }}>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-brand-600" />
            <h3 className="font-bold text-neutral-900 text-sm">{suggestion.title}</h3>
          </div>
          <p className="text-neutral-600 text-xs">{suggestion.description}</p>
          <p className="mt-2 font-semibold text-neutral-800 text-xs">{suggestion.action}</p>
        </div>
      )}

      <div className="animate-slide-up rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-md" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-brand-600" />
            <h3 className="font-bold text-neutral-900 text-sm">Gestión de Documentos</h3>
          </div>
          {onGoToDocumentos && (
            <button
              type="button"
              onClick={onGoToDocumentos}
              className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-xs text-white transition-colors hover:bg-brand-700"
            >
              Gestionar Documentos
            </button>
          )}
        </div>
        <p className="mt-2 text-neutral-500 text-xs">
          Administra cartas, amonestaciones y documentos oficiales asociados al estudiante.
        </p>
      </div>

      {activeCase && (
        <div className="animate-slide-up rounded-2xl border border-amber-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md" style={{ animationDelay: '120ms' }}>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-bold text-neutral-900 text-sm">Caso Activo</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-neutral-500">ID del caso:</span>{' '}
              <span className="font-medium text-neutral-800">{String(activeCase.id)}</span>
            </div>
            <div>
              <span className="text-neutral-500">Estado:</span>{' '}
              <span className="font-medium text-neutral-800">{String(activeCase.estado_actual)}</span>
            </div>
            <div>
              <span className="text-neutral-500">Tipo de infraccion:</span>{' '}
              <span className="font-medium text-neutral-800">{String(activeCase.tipo_infraccion)}</span>
            </div>
            <div>
              <span className="text-neutral-500">Ultima actualizacion:</span>{' '}
              <span className="font-medium text-neutral-800">
                {formatDate(String(activeCase.fecha_ultima_actualizacion))}
              </span>
            </div>
          </div>
        </div>
      )}

      {transitions.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <History className="h-4 w-4 text-brand-600" />
            Historial de Transiciones
          </h3>
          <div className="space-y-3">
            {transitions.map((t, i) => {
              return (
                <div
                  key={String(t.id)}
                  className="flex items-start gap-3 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-800 text-sm">
                      {`${String(t.from) || 'Inicio'} -> ${String(t.to) || String(t.stage_name) || '(sin destino)'}`}
                    </p>
                    <p className="text-neutral-400 text-xs">
                      {(t.date
                        ? formatDate(String(t.date))
                        : t.transition_date
                          ? formatDate(String(t.transition_date))
                          : 'Fecha no disponible') + (t.responsible ? ` - ${String(t.responsible)}` : '')}
                    </p>
                    {t.comment && <p className="mt-1 text-neutral-500 text-xs italic">{t.comment}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {etapas.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <CheckCircle2 className="h-4 w-4 text-brand-600" />
            Etapas del Proceso Disciplinario
          </h3>
          <div className="space-y-2">
            {etapas.map((etapa) => (
              <div
                key={String(etapa.id)}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-xs">
                    {String(etapa.step_number)}
                  </span>
                  <div>
                    <p className="font-medium text-neutral-800 text-sm">{String(etapa.stage_name)}</p>
                    <p className="text-neutral-400 text-xs">
                      {formatDate(String(etapa.transition_date))}
                      {etapa.responsible ? ` - ${String(etapa.responsible)}` : ''}
                    </p>
                  </div>
                </div>
                {etapa.comment && (
                  <p className="max-w-[200px] truncate text-right text-neutral-500 text-xs" title={String(etapa.comment)}>
                    {String(etapa.comment)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}
