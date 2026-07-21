/** @license SPDX-License-Identifier: Apache-2.0 */

import { CLASSIFICATION_OPTIONS } from './constants';
import { formatDate } from '../AnotacionesStudentDetailModal/constants';

const severityDot = (severity?: string) => {
  switch (severity) {
    case 'Leve': return 'bg-yellow-500';
    case 'Grave': return 'bg-orange-500';
    case 'Muy Grave': return 'bg-red-500';
    case 'Gravísima': return 'bg-rose-600';
    default: return 'bg-yellow-500';
  }
};

interface ReviewStepProps {
  studentName: string;
  course: string;
  annotations: unknown[];
  classification: string;
  fileName: string;
}

export default function ReviewStep({
  studentName,
  course,
  annotations,
  classification,
  fileName,
}: ReviewStepProps) {
  const classLabel = CLASSIFICATION_OPTIONS.find((o) => o.value === classification)?.label || classification;
  const negativeAnnotations = annotations.filter((a) => (a as Record<string, string>).type === 'Negativa');
  const positiveCount = annotations.filter((a) => (a as Record<string, string>).type === 'Positiva').length;
  const infoCount = annotations.length - negativeAnnotations.length - positiveCount;

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Revisión Final</p>

      {/* Resumen */}
      <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Estudiante:</span>
          <span className="font-medium text-neutral-800">{studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Curso:</span>
          <span className="font-medium text-neutral-800">{course}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Anotaciones:</span>
          <span className="font-medium text-neutral-800">
            {annotations.length} total ({negativeAnnotations.length} negativas{positiveCount > 0 ? ` / ${positiveCount} positivas` : ''}{infoCount > 0 ? ` / ${infoCount} informativas` : ''})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Medida:</span>
          <span className="font-medium text-neutral-800">{classLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Documento:</span>
          <span className="font-medium text-neutral-800">{fileName || 'Ninguno'}</span>
        </div>
      </div>

      {/* Lista de anotaciones negativas */}
      {negativeAnnotations.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold text-neutral-500 text-xs uppercase tracking-wider">
            Anotaciones que motivan la medida: {negativeAnnotations.length} de {annotations.length}
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {negativeAnnotations.map((ann, i) => {
              const a = ann as Record<string, string | undefined>;
              return (
                <div
                  key={a.id || `neg-${i}`}
                  className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-white p-2.5"
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityDot(a.severity)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-neutral-400 text-xs">{a.date ? formatDate(a.date) : 'Sin fecha'}</p>
                    <p className="text-neutral-700 text-sm">{a.text || 'Sin descripción'}</p>
                    <p className="text-neutral-400 text-xs">
                      {a.registered_by || 'Inspectoría'} — {a.severity || 'Leve'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
