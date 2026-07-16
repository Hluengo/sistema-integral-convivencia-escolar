/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, AlertTriangle, History, CheckCircle2 } from 'lucide-react';
import type { Annotation } from '../../../types';
import { getSemaphoricStyle } from '../../../lib/anotacionesUtils';
import { formatDate, STATUS_STYLE, SEVERITY_BADGE, type StudentInfo, type DisciplinayRecord } from './constants';

interface StudentSummaryTabProps {
  student: StudentInfo;
  annotations: Annotation[];
  currentMeasure: string;
  transitions: DisciplinayRecord[];
  etapas: DisciplinayRecord[];
  activeCase: DisciplinayRecord | null;
  dateStr: string;
}

export default function StudentSummaryTab({
  student,
  annotations,
  currentMeasure,
  transitions,
  etapas,
  activeCase,
  dateStr,
}: StudentSummaryTabProps) {
  const negativeCount = annotations.filter((a) => a.type === 'Negativa').length;
  const semaphoric = getSemaphoricStyle(negativeCount);
  const statusKey = student.disciplinary_status || 'Verde';
  const statusInfo = STATUS_STYLE[statusKey] || STATUS_STYLE.Verde;

  return (
    <div className="stagger-children space-y-5">
      <div className="animate-slide-up rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md" style={{ animationDelay: '0ms' }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <Shield className="h-4 w-4 text-brand-600" />
            Medida Disciplinaria Actual
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-xs${semaphoric.badge}`}
          >
            <span className={`inline-block h-2 w-2 rounded-full${semaphoric.dot}`} />
            {student.disciplinary_status}
          </span>
        </div>
        {currentMeasure ? (
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="font-medium text-neutral-700 text-sm">{currentMeasure}</p>
            <p className="mt-1 text-neutral-400 text-xs">Ultima actualizacion: {dateStr}</p>
          </div>
        ) : (
          <p className="text-neutral-400 text-sm italic">
            No hay una medida disciplinaria activa registrada.
          </p>
        )}
      </div>

      <div className="animate-slide-up grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: '60ms' }}>
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
            <Shield className="h-3 w-3" />
            Estado General
          </p>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-xs ${statusInfo.bg} ${statusInfo.text}`}>
            <span className={`inline-block h-2 w-2 rounded-full${semaphoric.dot}`} />
            {statusInfo.label}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="mb-1 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
            Anotaciones Negativas
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`font-extrabold text-2xl${semaphoric.text}`}>{negativeCount}</span>
            <span className="text-neutral-400 text-xs">registros</span>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="mb-1 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
            Anotaciones Positivas
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-2xl text-emerald-600">
              {student.positive_annotations_count ?? 0}
            </span>
            <span className="text-neutral-400 text-xs">registros</span>
          </div>
        </div>
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
                  key={String(t.id) || i}
                  className="flex items-start gap-3 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-400" />
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
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-xs">
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

      {!currentMeasure && transitions.length === 0 && etapas.length === 0 && !activeCase && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 text-center shadow-xs">
          <Shield className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
          <p className="text-neutral-500 text-sm">
            No hay informacion adicional disponible del proceso disciplinario.
          </p>
          <p className="mt-1 text-neutral-400 text-xs">
            Los datos apareceran a medida que se registren medidas y transiciones.
          </p>
        </div>
      )}
    </div>
  );
}
