/** @license SPDX-License-Identifier: Apache-2.0 */

import { CLASSIFICATION_OPTIONS } from './constants';

interface ReviewStepProps {
  studentName: string;
  course: string;
  annotationCount: number;
  classification: string;
  fileName: string;
}

export default function ReviewStep({
  studentName,
  course,
  annotationCount,
  classification,
  fileName,
}: ReviewStepProps) {
  const classLabel = CLASSIFICATION_OPTIONS.find((o) => o.value === classification)?.label || classification;

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Revisión Final</p>
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
          <span className="font-medium text-neutral-800">{annotationCount} detectadas</span>
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
    </div>
  );
}
